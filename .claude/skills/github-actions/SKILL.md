---
name: github-actions
description: GitHub Actions convention - every custom, deployment, release, or scheduled workflow must post Slack success and failure notifications via SLACK_WEBHOOK_URL. Load when creating or editing a workflow under .github/workflows.
---

# GitHub Actions Workflow Notifications

**When creating new GitHub Actions workflows, ALWAYS add Slack notifications for success and failure outcomes.**

#### **✅ WHEN TO ADD Slack Notifications**

- **Custom workflows** - Any new workflow created for project-specific automation
- **Deployment workflows** - Release, build, or deployment pipelines
- **Automated operations** - Scheduled jobs, syncs, or maintenance tasks
- **Release workflows** - Version updates, releases, or publishing

#### **❌ WHEN NOT TO ADD Slack Notifications**

- **CI workflows** - `ci.yml` (handled separately via CI settings)
- **PR/Review workflows** - Code quality checks running on every PR

#### **🔧 Implementation Pattern**

**Always add both success and failure notifications at the end of the job:**

```yaml
- name: Notify Slack - Success
  if: success()
  run: |
    curl -X POST --data '{"text":"✅ Workflow Name Completed Successfully\nDetails: https://link-to-result"}' ${{ secrets.SLACK_WEBHOOK_URL }}

- name: Notify Slack - Failure
  if: failure()
  run: |
    curl -X POST --data "{\"text\":\"❌ Workflow Name Failed\nAction: https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}\"}" ${{ secrets.SLACK_WEBHOOK_URL }}
```

#### **🏗️ Best Practices**

**Include relevant links in success messages:**

- Release workflows → Link to GitHub release
- Build workflows → Link to build artifact or deployment
- Sync workflows → Link to action run for details

**Always include action run link in failure messages:**

- Allows quick navigation to logs for debugging
- Use: `https://github.com/${{ github.repository }}/actions/runs/${{ github.run_id }}`

**Use consistent emoji indicators:**

- ✅ Success
- ❌ Failure
- 🔄 In Progress (optional)

#### **🔑 Required Secrets**

- `SLACK_WEBHOOK_URL` - Incoming webhook URL for Slack notifications
- Must be configured in GitHub repository secrets
- Never hardcode webhook URLs in workflow files

**Rationale:** Ensures team visibility into automated workflows, enabling quick response to failures and tracking deployment progress.
