# AEGIS NEXUS — Terraform Infrastructure
# Cloud-native deployment on AWS (EKS + managed services)

terraform {
  required_version = ">= 1.7.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.40"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.27"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.13"
    }
  }

  backend "s3" {
    bucket         = "aegis-nexus-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "aegis-terraform-locks"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "aegis-nexus"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# ==============================================================
# Variables
# ==============================================================

variable "aws_region"   { default = "us-east-1" }
variable "environment"  { default = "production" }
variable "cluster_name" { default = "aegis-nexus" }

variable "eks_node_groups" {
  default = {
    general = {
      instance_types = ["m6i.xlarge"]
      min_size       = 3
      max_size       = 10
      desired_size   = 3
    }
    ai_workloads = {
      instance_types = ["c6i.4xlarge"]
      min_size       = 2
      max_size       = 8
      desired_size   = 2
      taints = [{
        key    = "workload"
        value  = "ai"
        effect = "NO_SCHEDULE"
      }]
    }
    gpu = {
      instance_types = ["g4dn.xlarge"]
      min_size       = 0
      max_size       = 4
      desired_size   = 0
    }
  }
}

# ==============================================================
# Networking
# ==============================================================

module "vpc" {
  source  = "./modules/vpc"

  name             = "${var.cluster_name}-vpc"
  cidr             = "10.100.0.0/16"
  azs              = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets  = ["10.100.1.0/24", "10.100.2.0/24", "10.100.3.0/24"]
  public_subnets   = ["10.100.101.0/24", "10.100.102.0/24", "10.100.103.0/24"]
  enable_nat_gateway   = true
  single_nat_gateway   = false
  enable_dns_hostnames = true
  enable_dns_support   = true
}

# ==============================================================
# EKS Cluster
# ==============================================================

module "eks" {
  source  = "./modules/eks"

  cluster_name    = var.cluster_name
  cluster_version = "1.30"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnets

  node_groups = var.eks_node_groups

  addons = {
    coredns              = { addon_version = "v1.11.1-eksbuild.4" }
    kube-proxy           = { addon_version = "v1.30.0-eksbuild.3" }
    vpc-cni              = { addon_version = "v1.18.1-eksbuild.1" }
    aws-ebs-csi-driver   = { addon_version = "v1.31.0-eksbuild.1" }
    aws-efs-csi-driver   = { addon_version = "v2.0.4-eksbuild.1" }
  }

  enable_cluster_creator_admin_permissions = true
}

# ==============================================================
# Managed Kafka (MSK)
# ==============================================================

module "msk" {
  source = "./modules/msk"

  cluster_name   = "${var.cluster_name}-kafka"
  kafka_version  = "3.6.0"
  instance_type  = "kafka.m5.xlarge"
  broker_count   = 3
  subnet_ids     = module.vpc.private_subnets
  vpc_id         = module.vpc.vpc_id

  topics = [
    "aegis.raw-events",
    "aegis.classified-events",
    "aegis.threat-alerts",
    "aegis.agent-tasks",
    "aegis.agent-findings",
    "aegis.reports",
  ]
}

# ==============================================================
# RDS PostgreSQL with pgvector
# ==============================================================

module "rds" {
  source = "./modules/rds"

  identifier     = "${var.cluster_name}-postgres"
  engine         = "postgres"
  engine_version = "16.2"
  instance_class = "db.r7g.xlarge"
  storage        = 500
  multi_az       = true
  subnet_ids     = module.vpc.private_subnets
  vpc_id         = module.vpc.vpc_id

  parameters = [
    { name = "shared_preload_libraries", value = "pg_stat_statements,vector" },
    { name = "max_connections",          value = "500" },
    { name = "work_mem",                 value = "65536" },
  ]
}

# ==============================================================
# ElastiCache Redis
# ==============================================================

resource "aws_elasticache_replication_group" "aegis_redis" {
  replication_group_id = "${var.cluster_name}-redis"
  description          = "AEGIS session cache and rate limiting"
  node_type            = "cache.r7g.large"
  num_cache_clusters   = 3
  automatic_failover_enabled = true
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  subnet_group_name    = aws_elasticache_subnet_group.redis.name
}

# ==============================================================
# S3 Buckets
# ==============================================================

resource "aws_s3_bucket" "intelligence_artifacts" {
  bucket = "${var.cluster_name}-intelligence-artifacts-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_versioning" "intelligence_artifacts" {
  bucket = aws_s3_bucket.intelligence_artifacts.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "intelligence_artifacts" {
  bucket = aws_s3_bucket.intelligence_artifacts.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ==============================================================
# Helm Charts — Platform Services
# ==============================================================

resource "helm_release" "cert_manager" {
  name             = "cert-manager"
  repository       = "https://charts.jetstack.io"
  chart            = "cert-manager"
  namespace        = "cert-manager"
  create_namespace = true
  version          = "v1.14.4"

  set { name = "installCRDs", value = "true" }
  depends_on = [module.eks]
}

resource "helm_release" "ingress_nginx" {
  name             = "ingress-nginx"
  repository       = "https://kubernetes.github.io/ingress-nginx"
  chart            = "ingress-nginx"
  namespace        = "ingress-nginx"
  create_namespace = true

  set { name = "controller.service.type",            value = "LoadBalancer" }
  set { name = "controller.service.annotations.service\\.beta\\.kubernetes\\.io/aws-load-balancer-type", value = "nlb" }
  depends_on = [module.eks]
}

resource "helm_release" "prometheus_stack" {
  name             = "kube-prometheus-stack"
  repository       = "https://prometheus-community.github.io/helm-charts"
  chart            = "kube-prometheus-stack"
  namespace        = "monitoring"
  create_namespace = true
  version          = "58.6.0"

  values = [file("${path.module}/helm-values/prometheus.yaml")]
  depends_on = [module.eks]
}

resource "helm_release" "loki" {
  name             = "loki"
  repository       = "https://grafana.github.io/helm-charts"
  chart            = "loki-stack"
  namespace        = "monitoring"
  create_namespace = true

  depends_on = [module.eks]
}

# ==============================================================
# Outputs
# ==============================================================

output "eks_cluster_endpoint"  { value = module.eks.cluster_endpoint }
output "kafka_bootstrap_brokers" { value = module.msk.bootstrap_brokers }
output "rds_endpoint"           { value = module.rds.endpoint }
output "redis_endpoint"         { value = aws_elasticache_replication_group.aegis_redis.primary_endpoint_address }

data "aws_caller_identity" "current" {}
