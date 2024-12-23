resource "github_repository" "io_messages" {
  name        = local.repository
  description = "This is a monorepo that contains all the backend microservices and functionalities related to messaging in IO."

  #tfsec:ignore:github-repositories-private
  visibility = "public"

  allow_auto_merge            = true
  allow_merge_commit          = false
  squash_merge_commit_title   = "PR_TITLE"
  squash_merge_commit_message = "BLANK"

  allow_update_branch = true

  delete_branch_on_merge = true

  has_projects    = false
  has_wiki        = false
  has_discussions = false
  has_issues      = false
  has_downloads   = false

  topics = ["io", "messages", "backend", "comunicazione", "iocom"]

  vulnerability_alerts = true

  archive_on_destroy = true
}
