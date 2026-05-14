from rest_framework import serializers

class CreateCooperativeSerializer(serializers.Serializer):
    name = serializers.CharField()
    registration_number = serializers.CharField()
    state = serializers.CharField()
    cooperative_type = serializers.ChoiceField(choices=["THRIFT", "CREDIT", "MULTIPURPOSE"])
    treasurer_bvn = serializers.CharField(min_length=11, max_length=11)

class CooperativeSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    registration_number = serializers.CharField()
    state = serializers.CharField()
    cooperative_type = serializers.CharField()
    squad_virtual_account_number = serializers.CharField(allow_null=True)
    health_score = serializers.IntegerField()
    is_active = serializers.BooleanField()
    created_at = serializers.DateTimeField(required=False)
