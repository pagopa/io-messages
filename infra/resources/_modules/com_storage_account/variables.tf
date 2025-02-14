variable "subnet_pep_id" {
  type = string
}

variable "tags" {
  type = map(string)
}

variable "environment" {
  type = object({
    prefix    = string
    env_short = string
    location  = string
  })
}

variable "resource_group_name" {
  type = string
}
