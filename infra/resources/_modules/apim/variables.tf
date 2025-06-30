variable "prefix" {
  type = string
  validation {
    condition = (
      length(var.prefix) < 6
    )
    error_message = "Max length is 6 chars."
  }
}

variable "env_short" {
  type = string
  validation {
    condition = (
      length(var.env_short) == 1
    )
    error_message = "Length must be 1 chars."
  }
}

variable "domain" {
  type = string
  validation {
    condition = (
      length(var.domain) <= 12
    )
    error_message = "Max length is 12 chars."
  }
}

variable "location" {
  type        = string
  description = "One of westeurope, northeurope"
}

variable "location_short" {
  type        = string
  description = "location_short"
}

variable "legacy_location_short" {
  type        = string
  description = "legacy_location_short"
}

variable "key_vault" {
  type = object({
    name = string
    id   = string
  })
}

variable "payment_updater_url" {
  type        = string
  description = "Payment Updater URL"
}
