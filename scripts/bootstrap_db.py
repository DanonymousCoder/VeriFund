import os

import psycopg2


SQL = """
CREATE TABLE IF NOT EXISTS members (
    id VARCHAR(36) PRIMARY KEY,
    bvn_hash VARCHAR(64) UNIQUE NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(32) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash TEXT NOT NULL,
    bvn_verified BOOLEAN NOT NULL DEFAULT FALSE,
    bvn_verified_at TIMESTAMPTZ NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'MEMBER',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cooperatives (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    registration_number VARCHAR(255) UNIQUE NOT NULL,
    state VARCHAR(255) NOT NULL,
    cooperative_type VARCHAR(32) NOT NULL,
    squad_virtual_account_number VARCHAR(32),
    squad_customer_id VARCHAR(128),
    health_score INT NOT NULL DEFAULT 50,
    health_score_updated_at TIMESTAMPTZ NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS direct_debit_mandates (
    id VARCHAR(36) PRIMARY KEY,
    member_id VARCHAR(36) NOT NULL,
    cooperative_id VARCHAR(36) NOT NULL,
    squad_mandate_id VARCHAR(128) UNIQUE NOT NULL,
    merchant_reference VARCHAR(128) UNIQUE NOT NULL,
    account_number VARCHAR(32) NOT NULL,
    bank_code VARCHAR(16) NOT NULL,
    customer_email VARCHAR(255),
    description TEXT,
    amount_kobo BIGINT NOT NULL,
    debit_day INT NOT NULL DEFAULT 1,
    frequency VARCHAR(32) NOT NULL DEFAULT 'monthly',
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    ready_to_debit BOOLEAN NOT NULL DEFAULT FALSE,
    start_date TIMESTAMPTZ NULL,
    end_date TIMESTAMPTZ NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contribution_virtual_accounts (
    id VARCHAR(36) PRIMARY KEY,
    member_id VARCHAR(36) NOT NULL,
    cooperative_id VARCHAR(36) NOT NULL,
    customer_identifier VARCHAR(128) UNIQUE NOT NULL,
    virtual_account_number VARCHAR(32) UNIQUE NOT NULL,
    account_name VARCHAR(255),
    bank_name VARCHAR(255),
    bvn_last4 VARCHAR(4),
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contributions (
    id VARCHAR(36) PRIMARY KEY,
    member_id VARCHAR(36) NOT NULL,
    cooperative_id VARCHAR(36) NOT NULL,
    amount_kobo BIGINT NOT NULL,
    squad_transaction_ref VARCHAR(128) UNIQUE NOT NULL,
    mandate_id VARCHAR(36),
    contribution_virtual_account_id VARCHAR(36),
    payment_channel VARCHAR(32) NOT NULL DEFAULT 'virtual-account',
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    anomaly_score DECIMAL(4, 3),
    contributed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS squad_webhook_events (
    id VARCHAR(36) PRIMARY KEY,
    event_name VARCHAR(64) NOT NULL,
    transaction_reference VARCHAR(128),
    signature_valid BOOLEAN NOT NULL DEFAULT FALSE,
    processing_status VARCHAR(32) NOT NULL DEFAULT 'RECEIVED',
    payload_json TEXT NOT NULL,
    error_detail TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id VARCHAR(36) PRIMARY KEY,
    cooperative_id VARCHAR(36) NOT NULL,
    requested_by VARCHAR(36) NOT NULL,
    amount_kobo BIGINT NOT NULL,
    destination_account VARCHAR(32) NOT NULL,
    destination_bank_code VARCHAR(16) NOT NULL,
    destination_account_name VARCHAR(255),
    purpose TEXT NOT NULL,
    ai_risk_score DECIMAL(4, 3),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    squad_transfer_ref VARCHAR(128),
    last_transfer_status VARCHAR(64),
    transfer_error_detail TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS withdrawal_signatures (
    id VARCHAR(36) PRIMARY KEY,
    withdrawal_request_id VARCHAR(36) NOT NULL,
    signed_by VARCHAR(36) NOT NULL,
    role VARCHAR(32) NOT NULL,
    signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification_logs (
    id VARCHAR(36) PRIMARY KEY,
    channel VARCHAR(32) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(32) NOT NULL,
    provider_response TEXT,
    error_detail TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE withdrawal_requests
    ADD COLUMN IF NOT EXISTS destination_account_name VARCHAR(255);
ALTER TABLE withdrawal_requests
    ADD COLUMN IF NOT EXISTS last_transfer_status VARCHAR(64);
ALTER TABLE withdrawal_requests
    ADD COLUMN IF NOT EXISTS transfer_error_detail TEXT;
"""


def main() -> None:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise SystemExit("DATABASE_URL is required.")

    connection = psycopg2.connect(database_url)
    connection.autocommit = True
    with connection.cursor() as cursor:
        cursor.execute(SQL)
    connection.close()
    print("Database bootstrap complete.")


if __name__ == "__main__":
    main()
