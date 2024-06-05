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

# REPO DEFINED VARIABLES
variable "cosmos_db_api_endpoint" {
  type        = string
  description = "Cosmos DB endpoint to use as application environment variable"
}

variable "cosmos_db_remote_content_endpoint" {
  type        = string
  description = "Cosmos DB endpoint to use as application environment variable"
}

variable "key_vault_weu_id" {
  type        = string
  description = "Id of the common Key Vault where save secrets in"
}

variable "key_vault_weu_messages_id" {
  type        = string
  description = "Id of the messages Key Vault where save secrets in"
}

variable "cosmos_database_names" {
  type        = list(string)
  description = "List of Cosmos DB database names"
}

variable "appbackendli_token" {
  type        = string
  description = "Token to access appbackendli"
}

variable "message_storage_account_blob_uri" {
  type        = string
  description = "Uri to connect to message storage account"
}

variable "notification_storage_account_queue_uri" {
  type        = string
  description = "Uri to connect to notification storage account"
}

variable "internal_user_id" {
  type        = string
  description = "Internal user to bypass"
}


