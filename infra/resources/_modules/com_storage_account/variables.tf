variable "subnet_pep_id" {
  type = string
}

variable "tags" {
  type = map(string)
}

variable "environment" {
  type = object({
    prefix          = string
    env_short       = string
    location        = string
    domain          = string
    instance_number = string
  })
}

variable "resource_group_name" {
  type = string
}
