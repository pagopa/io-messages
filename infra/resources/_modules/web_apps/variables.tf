variable "tags" {
  type        = map(any)
  description = "Resources tags"
}

variable "environment" {
  type = object({
    prefix    = string
    env_short = string
    location  = string
    domain    = string
  })

  description = "Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."
}

variable "resource_group_name" {
  type        = string
  description = "Resource group to deploy resources to"
}

variable "private_dns_zone_resource_group_name" {
  type        = string
  description = "Resource group name of the private DNS zone to use for private endpoints"
}

variable "virtual_network" {
  type = object({
    name                = string
    resource_group_name = string
  })
}

variable "subnet_pep_id" {
  type = string
}

variable "subnet_cidrs" {
  type = object({
    notif_func      = string
    citizen_func    = string
    etl_func        = string
    push_notif_func = string
  })
}

variable "application_insights" {
  type = object({
    connection_string   = string
    instrumentation_key = string
  })
}

variable "application_insights_sampling_percentage" {
  type        = number
  description = "The sampling percentage of logs of application insight"
}

variable "common_key_vault" {
  type = object({
    id   = string
    name = string
  })
}

variable "eventhub_namespace" {
  type = object({
    id   = string
    name = string
  })
}

variable "messages_content_container" {
  type = object({
    id   = string
    name = string
  })
}

variable "messages_storage_account" {
  type = object({
    id   = string
    name = string
  })
}

variable "com_st_id" {
  type = string
}

variable "com_st_connectiostring" {
  type = string
}


variable "cosmosdb_account_api" {
  type = object({
    id                  = string
    name                = string
    endpoint            = string
    primary_key         = string
    resource_group_name = string
  })
}

variable "io_com_cosmos" {
  type = object({
    id                  = string
    name                = string
    endpoint            = string
    resource_group_name = string
    primary_key         = string
  })
}

variable "tenant_id" {
  type = string
}

variable "action_group_id" {
  type        = string
  description = "The ID of the action group"
}

variable "app_settings" {
  type = object({
    message_error_table_storage_uri = string,
    eventhub_connection_uri         = string,
  })
}

variable "message_content_storage" {
  type = object({
    endpoint          = string
    connection_string = string
  })
}

variable "redis_cache" {
  type = object({
    id         = string
    hostname   = string
    port       = string
    access_key = string
  })
}

variable "nat_gateway_id" {
  type        = string
  description = "The ID of the NAT Gateway"
}
