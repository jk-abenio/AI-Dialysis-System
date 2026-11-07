
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def add_staff_user_relation(apps, schema_editor):
    Staff = apps.get_model("staff", "Staff")
    User = apps.get_model(*settings.AUTH_USER_MODEL.split("."))

    connection = schema_editor.connection
    quote = connection.ops.quote_name

    staff_table = quote(Staff._meta.db_table)
    user_table = quote(User._meta.db_table)

    user_pk = User._meta.pk
    user_column = quote(user_pk.column)
    user_type = user_pk.rel_db_type(connection)

    schema_editor.execute(
        f"ALTER TABLE {staff_table} "
        f"ADD COLUMN {quote('user_id')} {user_type} NULL"
    )

    schema_editor.execute(
        f"ALTER TABLE {staff_table} "
        f"ADD UNIQUE KEY {quote('staff_staff_user_id_uniq')} "
        f"({quote('user_id')})"
    )

    schema_editor.execute(
        f"ALTER TABLE {staff_table} "
        f"ADD CONSTRAINT {quote('staff_staff_user_id_fk')} "
        f"FOREIGN KEY ({quote('user_id')}) "
        f"REFERENCES {user_table} ({user_column})"
    )


def remove_staff_user_relation(apps, schema_editor):
    Staff = apps.get_model("staff", "Staff")

    connection = schema_editor.connection
    quote = connection.ops.quote_name
    staff_table = quote(Staff._meta.db_table)

    schema_editor.execute(
        f"ALTER TABLE {staff_table} "
        f"DROP FOREIGN KEY {quote('staff_staff_user_id_fk')}"
    )

    schema_editor.execute(
        f"ALTER TABLE {staff_table} "
        f"DROP INDEX {quote('staff_staff_user_id_uniq')}"
    )

    schema_editor.execute(
        f"ALTER TABLE {staff_table} "
        f"DROP COLUMN {quote('user_id')}"
    )


class Migration(migrations.Migration):

    dependencies = [
        ('staff', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.RunPython(
                    add_staff_user_relation,
                    remove_staff_user_relation,
                ),
            ],
            state_operations=[
                migrations.AddField(
                    model_name='staff',
                    name='user',
                    field=models.OneToOneField(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name='staff_profile',
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
    ]
