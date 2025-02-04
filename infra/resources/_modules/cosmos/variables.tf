variable "cosmosdb_account" {
  type = object({
    id                  = string
    name                = string
    resource_group_name = string
  })
}

variable "tags" {
  type = map(string)
}

variable "resource_group" {
  type = string
}

variable "action_group_id" {
  type = string
}

variable "subnet_pep_id" {
  type = string
}

variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    location        = string
    app_name        = string
    instance_number = string
  })
}
