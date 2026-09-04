"""Tests for processor column presets.

Runnable via pytest or: python tests/test_presets.py
"""
from exceptionos.loaders import resolve_mapping
from exceptionos.presets import get_preset, list_presets


def test_stripe_preset_resolves():
    headers = ["balance_transaction_id", "charge_id", "created", "gross",
               "fee", "net", "currency", "reporting_category"]
    m = resolve_mapping(headers, preset="stripe")
    assert m["key"] == "charge_id"
    assert m["amount"] == "gross"
    assert m["currency"] == "currency"
    assert m["date"] == "created"


def test_preset_falls_back_to_autodetect_for_missing_columns():
    # The PayPal preset expects "Gross"/"Transaction ID"; with only generic
    # columns present, resolution should fall back to auto-detection.
    headers = ["id", "amount", "currency", "date"]
    m = resolve_mapping(headers, preset="paypal")
    assert m["amount"] == "amount"
    assert m["key"] == "id"


def test_unknown_preset_raises():
    try:
        get_preset("definitely-not-a-processor")
    except ValueError:
        return
    raise AssertionError("expected ValueError for unknown preset")


def test_list_presets_includes_majors():
    names = list_presets()
    for expected in ("stripe", "adyen", "paypal", "razorpay"):
        assert expected in names


if __name__ == "__main__":
    passed = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            fn()
            print("ok  ", name)
            passed += 1
    print(f"\n{passed} tests passed")
