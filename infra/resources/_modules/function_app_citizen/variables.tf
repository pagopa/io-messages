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

variable "cidr_subnet_messages_citizen_func" {
  type        = string
  description = "CIDR block for messages citizen function app subnet"
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

variable "instance_number" {
  type        = string
  description = "The index that counts levels of this functions app"
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

variable "message_storage_account_blob_connection_string" {
  type        = string
  description = "Connection string to connect to message storage account"
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

variable "use_fallback" {
  type        = bool
  description = "Wheter to use fallback to composition or not"
}

variable "ff_type" {
  type        = string
  description = "Specify the type for the feature flag to go for beta testers, canary regex or production users"
}

variable "ff_beta_tester_list" {
  type        = string
  description = "Specify the list of beta testers fiscal codes hashes"
}

variable "ff_canary_users_regex" {
  type        = string
  description = "Specify a regex to match some hashes of production users fiscal codes"
}

variable "pn_service_id" {
  type        = string
  description = "The Service ID of PN service"
  default     = "01G40DWQGKY5GRWSNM4303VNRP"
}

variable "io_sign_service_id" {
  type        = string
  description = "The Service ID of io-sign service"
  default     = "01GQQZ9HF5GAPRVKJM1VDAVFHM"
}

variable "io_receipt_service_test_id" {
  type        = string
  description = "The Service ID of io-receipt service"
  default     = "01H4ZJ62C1CPGJ0PX8Q1BP7FAB"
}

variable "io_receipt_service_id" {
  type        = string
  description = "The Service ID of io-receipt service"
  default     = "01HD63674XJ1R6XCNHH24PCRR2"
}

variable "third_party_mock_service_id" {
  type        = string
  description = "The Service ID of the Third Party Mock service"
  default     = "01GQQDPM127KFGG6T3660D5TXD"
}

variable "pn_remote_config_id" {
  type        = string
  description = "The Remote Content Config ID of PN service"
  default     = "01HMVMHCZZ8D0VTFWMRHBM5D6F"
}

variable "io_sign_remote_config_id" {
  type        = string
  description = "The Remote Content Config ID of io-sign service"
  default     = "01HMVMDTHXCESMZ72NA701EKGQ"
}

variable "io_receipt_remote_config_test_id" {
  type        = string
  description = "The Remote Content Config ID of io-receipt service"
  default     = "01HMVMCDD3JFYTPKT4ZN4WQ73B"
}

variable "io_receipt_remote_config_id" {
  type        = string
  description = "The Remote Content Config ID of io-receipt service"
  default     = "01HMVM9W74RWH93NT1EYNKKNNR"
}

variable "third_party_mock_remote_config_id" {
  type        = string
  description = "The Remote Content Config ID of the Third Party Mock service"
  default     = "01HMVM4N4XFJ8VBR1FXYFZ9QFB"
}