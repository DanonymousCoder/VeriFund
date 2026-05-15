from rest_framework import serializers

class RequestWithdrawalSerializer(serializers.Serializer):
    cooperative_id = serializers.CharField()
    amount_kobo = serializers.IntegerField(min_value=1)
    destination_account = serializers.CharField()
    destination_bank_code = serializers.CharField()
    purpose = serializers.CharField()

class SignWithdrawalSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=["TREASURER", "EXECUTIVE1", "EXECUTIVE2"])


class LookupRecipientSerializer(serializers.Serializer):
    destination_bank_code = serializers.CharField()
    destination_account = serializers.CharField(min_length=10, max_length=10)


class WithdrawalSerializer(serializers.Serializer):
    id = serializers.CharField()
    cooperative_id = serializers.CharField()
    requested_by = serializers.CharField()
    amount_kobo = serializers.IntegerField()
    destination_account = serializers.CharField()
    destination_account_name = serializers.CharField(allow_null=True, required=False)
    purpose = serializers.CharField()
    ai_risk_score = serializers.FloatField(allow_null=True)
    status = serializers.CharField()
    signatures = serializers.ListField(child=serializers.DictField(), default=[])
    created_at = serializers.DateTimeField(required=False)
