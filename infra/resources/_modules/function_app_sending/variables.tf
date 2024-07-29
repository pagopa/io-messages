variable "prefix" {
  type        = string
  description = "IO Prefix"
}

variable "env_short" {
  type        = string
  description = "Short environment"
}

variable "project" {
  type        = string
  description = "IO prefix and short environment"
}

variable "location" {
  type        = string
  description = "Azure region"
}

variable "domain" {
  type        = string
  description = "Domain"
}

variable "tags" {
  type        = map(any)
  description = "Resource tags"
}

variable "resource_group_name" {
  type        = string
  description = "Name of the resource group where resources will be created"
}

variable "cidr_subnet_messages_sending_func" {
  type        = string
  description = "CIDR block for messages sending function app subnet"
}

variable "private_endpoint_subnet_id" {
  type        = string
  description = "Private Endpoints subnet Id"
}

variable "virtual_network" {
  type = object({
    name                = string
    resource_group_name = string
  })
  description = "Virtual network to create subnet in"
}

variable "private_dns_zone_resource_group_name" {
  type        = string
  description = "Resource group name of the private DNS zone to use for private endpoints"
}

variable "ai_instrumentation_key" {
  type        = string
  description = "The key to connect to application insights"
}

variable "ai_connection_string" {
  type        = string
  description = "The connection string to connect to application insights"
}

variable "ai_sampling_percentage" {
  type        = string
  description = "The sampling percentage for application insights"
}

# REPO DEFINED VARIABLES
variable "cosmos_db_api_endpoint" {
  type        = string
  description = "Cosmos DB endpoint to use as application environment variable"
}

variable "cosmos_db_api_key" {
  type        = string
  description = "Cosmos DB api key"
}

variable "cosmos_db_remote_content_endpoint" {
  type        = string
  description = "Cosmos DB endpoint to use as application environment variable"
}

variable "cosmos_db_remote_content_key" {
  type        = string
  description = "Cosmos DB api key"
}

variable "cosmos_database_names" {
  type        = list(string)
  description = "List of Cosmos DB database names"
}

variable "appbackendli_token" {
  type        = string
  description = "Token to access appbackendli"
}

variable "message_storage_account_blob_connection_string" {
  type        = string
  description = "Connection string to connect to message storage account"
}

variable "notification_storage_account_queue_connection_string" {
  type        = string
  description = "Connection string to connect to notification storage account"
}

variable "internal_user_id" {
  type        = string
  description = "Internal user to bypass"
}

variable "redis_url" {
  type        = string
  description = "Redis url"
}

variable "redis_port" {
  type        = string
  description = "Redis port"
}

variable "redis_password" {
  type        = string
  description = "Redis password"
}
