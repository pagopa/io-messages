variable "resource_group_name" {
  type        = string
  description = "Resource group to deploy resources to"
}

variable "alert_iocom_error_notification_slack_email" {
  type        = string
  description = "Uri of the slack channel where to send domain related alerts"
}
