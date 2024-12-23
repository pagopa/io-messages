variable "prefix" {
  type        = string
  description = "prefix used to create resource naming"
}

variable "location" {
  type        = string
  description = "location used to create resource naming"
}

variable "env_short" {
  type        = string
  description = "env_short used to create resource naming"
}

variable "domain" {
  type        = string
  description = "domain used to create resource naming"
}

variable "tags" {
  type        = map(any)
  description = "Resources tags"
}

variable "subnet_pep_id" {
  type        = string
  description = "subnet id"
}

variable "resource_group_name" {
  type        = string
  description = "Name of the resource group"
}

variable "private_dns_zone_resource_group_name" {
  type        = string
  description = "Name of the private dns zone resource group name"
}

