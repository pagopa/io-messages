variable "tags" {
  type = map(string)
}

variable "resource_group_name" {
  type = string
}

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
