variable "project" {
  type        = string
  description = "IO prefix, short environment and short location"
}

variable "project_legacy" {
  type        = string
  description = "IO prefix and short environment"
}

variable "location" {
  type        = string
  description = "Azure region"
}

variable "location_short" {
  type        = string
  description = "Azure region short name"
}

variable "tags" {
  type        = map(any)
  description = "Resource tags"
}

variable "resource_group_name" {
  type        = string
  description = "Resource group name for VNet"
}

variable "legacy_resource_group_name" {
  type        = string
  description = "Resource group name for VNet"
}

variable "error_action_group_id" {
  type = string
}

variable "environment" {
  type = object({
    prefix    = string
    env_short = string
    location  = string
  })
}

variable "subnet_pep_id" {
  type = string
}
