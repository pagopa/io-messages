variable "tags" {
  type = map(string)
}

variable "resource_group_name" {
  type = string
}

variable "environment" {
  type = object({
    prefix      = string,
    environment = string,
    location    = string,
    domain      = string
  })
}

variable "key_vault_id" {
  type        = string
  description = "Id of the team domain key vault"
}

variable "secondary_geo_location" {
  type        = string
  default     = "spaincentral"
  description = "Secondary geo location for the CosmosDB account"
}

variable "subnet_pep_id" {
  type        = string
  description = "ID of the subnet where the private endpoint will be created"
}
