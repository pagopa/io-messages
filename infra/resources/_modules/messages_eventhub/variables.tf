variable "prefix" {
  type        = string
  description = "prefix used to create resource naming"
}

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

variable "instance_number" {
  type        = string
  description = "instance_number used to create resource naming"
}

variable "tags" {
  type        = map(any)
  description = "Resources tags"
}

