---
id: change-the-case-email-template
title: Change the case email templates
section: Configuration
answer: **Email parties** opens with *Generic Case Email* from `$/Common/Communications/Templates/i4u/Cases`, and **Open** lists every template in that folder. Edit or add templates there.
asks:
  - how do I change the case email template
  - add an email template for cases
  - what template does email parties use
keywords: [email, template, templates, communication, email parties, default template, generic case email]
related: [where-case-settings-live, email-the-parties]
verify:
  - The default template is set in the theme by its key; a site can't choose a different default yet (TODO.md).
---
- **Default template:** *Generic Case Email*, in `$/Common/Communications/Templates/i4u/Cases`. Change its wording there, and every case email starts from the new text.
- **More templates:** save them in the same folder and staff can pick them with **Open**.
- **Merge fields:** the email goes to one recipient per party, so a template can use each recipient's details.

Don't delete or recreate *Generic Case Email*: the page opens it by its key, and a new copy gets a new key.
