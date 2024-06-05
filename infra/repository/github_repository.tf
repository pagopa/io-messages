resource "github_repository" "io_messages" {
  name = local.repository

  #tfsec:ignore:github-repositories-private
  visibility = "public"

  allow_auto_merge   = false
  allow_rebase_merge = true
  allow_merge_commit = false
  allow_squash_merge = true

  delete_branch_on_merge = true

  has_projects    = false
  has_wiki        = false
  has_discussions = false
  has_issues      = false
  has_downloads   = false

  vulnerability_alerts = true

  archive_on_destroy = true
}
