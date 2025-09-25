variable "tags" {
  type = map(string)
}

variable "resource_group_name" {
  type = string
}

# variable "resource_group_name_itn" {
#   type        = string
#   description = "The resource group name for the ITN resources (needed for migration)"
# }

variable "location" {
  type = string
}

variable "location_short" {
  type = string
}

variable "domain" {
  type = string
}

variable "key_vault" {
  type = object({
    name = string
    id   = string
  })
}

variable "project" {
  type = string
}

variable "action_group_id" {
  type = string
}

variable "adgroup_com_devs_id" {
  type = string
}
