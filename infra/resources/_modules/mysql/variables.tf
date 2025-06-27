variable "tags" {
  type = map(string)
}

variable "resource_group_name" {
  type = string
}

variable "common_resource_group_name" {
  type = string
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

variable "virtual_network" {
  type = object({
    name                = string
    resource_group_name = string
  })
}

variable "subnet_cidrs" {
  type = object({
    com = string
  })
  description = "CIDR for the subnet where the MySQL server will be deployed."
}

variable "key_vault" {
  type = object({
    id = string
  })
}
