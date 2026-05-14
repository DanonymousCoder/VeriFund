from rest_framework import serializers


class CreateMandateSerializer(serializers.Serializer):
    cooperative_id = serializers.CharField()
    amount_kobo = serializers.IntegerField(min_value=1)
    account_number = serializers.CharField(min_length=10, max_length=10)
    bank_code = serializers.CharField()
    debit_day = serializers.IntegerField(min_value=1, max_value=28)
    bvn = serializers.CharField(min_length=11, max_length=11)
    address = serializers.CharField()
    customer_email = serializers.EmailField(required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)


class CreateContributionVirtualAccountSerializer(serializers.Serializer):
    cooperative_id = serializers.CharField()
    bvn = serializers.CharField(min_length=11, max_length=11)
    dob = serializers.CharField()
    address = serializers.CharField()
    gender = serializers.ChoiceField(choices=["1", "2"])
    phone_number = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)


class DebitMandateSerializer(serializers.Serializer):
    amount_kobo = serializers.IntegerField(min_value=1)
    narration = serializers.CharField()
    customer_email = serializers.EmailField(required=False, allow_blank=True)
    pass_charge = serializers.BooleanField(required=False, default=False)


class SimulateVirtualAccountPaymentSerializer(serializers.Serializer):
    cooperative_id = serializers.CharField()
    amount_kobo = serializers.IntegerField(min_value=1)


class ContributionSerializer(serializers.Serializer):
    id = serializers.CharField()
    member_id = serializers.CharField()
    cooperative_id = serializers.CharField()
    amount_kobo = serializers.IntegerField()
    squad_transaction_ref = serializers.CharField()
    contribution_virtual_account_id = serializers.CharField(allow_null=True)
    payment_channel = serializers.CharField()
    status = serializers.CharField()
    anomaly_score = serializers.FloatField(allow_null=True)
    contributed_at = serializers.DateTimeField()
