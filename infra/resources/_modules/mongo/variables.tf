variable "tags" {
  type = map(string)
}

variable "resource_group_name" {
  type = string
}

variable "key_vault_id" {
  type        = string
  description = "Id of the team domain key vault"
}

variable "project_legacy" {
  type        = string
  description = "The project name for legacy resources, used for cross-referencing"
}
