from django.db import models

class GmailConnection(models.Model):
    email_address = models.EmailField(blank=True, default="")
    token_data = models.JSONField(default=dict)
    connected_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.email_address or "Gmail Connection"
