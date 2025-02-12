variable "resource_group_name" {
  type        = string
  description = "Resource group to deploy resources to"
}

variable "io_com_slack_email" {
  type        = string
  description = "Uri of the slack channel where to send domain related alerts"
}

variable "project" {
  type        = string
  description = "IO prefix, short environment and short location"
}

variable "location" {
  type        = string
  description = "location used to create resource naming"
}
