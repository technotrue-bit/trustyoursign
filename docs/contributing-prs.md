# Writing pull requests

Every pull request description is written for someone who uses the site, not for another engineer. This is the default, from Joey.

Explain the update the way you would to a friend: what changed in the product, why it matters to the person using the site, and what they will actually notice.

## Use the template

GitHub starts each pull request from `.github/PULL_REQUEST_TEMPLATE.md`. Keep that shape:

- **What you'll notice** — what is different for someone using the site.
- **Why it matters** — why they should care.
- **How to check on the site** — where to look and what to try.

Keep it short. Replace the italic placeholder lines. Do not leave them in.

Skip jargon, file paths, function names, and how the code works. That detail does not belong at the top.

## For reviewers

If an engineer needs technical notes, put them in the collapsed **For reviewers** section at the bottom. If there is nothing technical to add, leave that section out.

The top of every description stays the plain product story.
