variable "environment" {
  type = object({
    prefix    = string
    env_short = string
    location  = string
    domain    = string
  })

  description = "Values which are used to generate resource names and location short names. They are all mandatory except for domain, which should not be used only in the case of a resource used by multiple domains."
}

variable "tags" {
  type        = map(any)
  description = "Resources tags"
}

variable "resource_group_name" {
  type        = string
  description = "Resource group to deploy resources to"
}

variable "virtual_network" {
  type = object({
    name                = string
    resource_group_name = string
  })
}

variable "subnet_cidr" {
  type = string
}

variable "subnet_pep_id" {
  type = string
}

variable "private_dns_zone_resource_group_name" {
  type = string
}

variable "log_analytics_workspace_id" {
  type = string
}
