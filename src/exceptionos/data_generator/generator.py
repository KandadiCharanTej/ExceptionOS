import csv
import json
import os
import random
from datetime import datetime, timedelta

SCENARIOS = [
    "normal",
    "gateway_fee",
    "refund",
    "duplicate",
    "missing",
    "delayed",
    "date_mismatch",
    "unknown"
]

def generate_datasets(output_dir, num_records, seed=42):
    random.seed(seed)
    
    os.makedirs(output_dir, exist_ok=True)
    
    ledger_data = []
    gateway_data = []
    bank_data = []
    ground_truth = []
    
    start_date = datetime(2026, 9, 1)
    
    for i in range(1, num_records + 1):
        txn_id = f"TXN-{seed}-{i:05d}"
        
        # Base realistic amounts: Rs. 99, 500, 1500, etc.
        base_amount = random.choice([99.00, 499.00, 500.00, 1500.00, 2999.00, 9999.00])
        base_date = start_date + timedelta(days=random.randint(0, 30))
        date_str = base_date.strftime("%Y-%m-%d")
        
        scenario = random.choice(SCENARIOS)
        
        # Default matching records
        l_rec = {"id": txn_id, "date": date_str, "amount": f"{base_amount:.2f}", "currency": "INR"}
        g_rec = {"id": txn_id, "date": date_str, "amount": f"{base_amount:.2f}", "currency": "INR"}
        b_rec = {"id": txn_id, "date": date_str, "amount": f"{base_amount:.2f}", "currency": "INR"}
        
        status = "matched"
        cause = "Normal transaction flow"
        
        if scenario == "normal":
            pass
            
        elif scenario == "gateway_fee":
            fee = random.choice([2.00, 5.00, 10.00])
            # Gateway passes the amount minus fee to bank
            g_rec["amount"] = f"{base_amount - fee:.2f}"
            b_rec["amount"] = f"{base_amount - fee:.2f}"
            status = "amount_mismatch"
            cause = "Gateway deducted processing fee"
            
        elif scenario == "refund":
            l_rec["amount"] = f"-{base_amount:.2f}"
            g_rec["amount"] = f"-{base_amount:.2f}"
            b_rec["amount"] = f"-{base_amount:.2f}"
            status = "matched"
            cause = "Normal refund"
            
        elif scenario == "duplicate":
            # Duplicate in gateway and bank
            gateway_data.append(g_rec.copy())
            bank_data.append(b_rec.copy())
            status = "unmatched_right"
            cause = "Processor settled same transaction twice"
            
        elif scenario == "missing":
            if random.choice([True, False]): # missing from processor
                g_rec = None
                b_rec = None
                status = "unmatched_left"
                cause = "Ledger recorded but processor never processed"
            else: # missing from ledger
                l_rec = None
                status = "unmatched_right"
                cause = "Processor settled but ledger missed recording"
                
        elif scenario == "delayed":
            delay = random.randint(1, 4)
            bank_date = base_date + timedelta(days=delay)
            b_rec["date"] = bank_date.strftime("%Y-%m-%d")
            status = "matched"
            cause = "Bank settlement delayed by few days"
            
        elif scenario == "date_mismatch":
            wrong_date = base_date + timedelta(days=random.randint(15, 60))
            g_rec["date"] = wrong_date.strftime("%Y-%m-%d")
            status = "matched"
            cause = "Severe date discrepancy due to system bug"
            
        elif scenario == "unknown":
            random_diff = random.choice([0.15, 1.50, 7.00, -3.00])
            b_rec["amount"] = f"{base_amount + random_diff:.2f}"
            status = "amount_mismatch"
            cause = "Unexplained random amount difference"

        if l_rec: ledger_data.append(l_rec)
        if g_rec: gateway_data.append(g_rec)
        if b_rec: bank_data.append(b_rec)
        
        ground_truth.append({
            "transaction_id": txn_id,
            "scenario_type": scenario,
            "expected_status": status,
            "actual_root_cause": cause,
            "expected_resolution": "Requires manual review" if "unexplained" in cause.lower() else "Automated handling"
        })
        
    _write_csv(os.path.join(output_dir, "ledger.csv"), ledger_data)
    _write_csv(os.path.join(output_dir, "gateway.csv"), gateway_data)
    _write_csv(os.path.join(output_dir, "bank.csv"), bank_data)
    
    with open(os.path.join(output_dir, "ground_truth.json"), "w", encoding="utf-8") as f:
        json.dump(ground_truth, f, indent=2)
        
    return len(ground_truth)

def _write_csv(path, data):
    if not data:
        return
    keys = ["id", "date", "amount", "currency"]
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        writer.writerows(data)

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Generate synthetic financial data for ExceptionOS")
    parser.add_argument("--train", type=int, default=500, help="Number of records for training dataset")
    parser.add_argument("--test", type=int, default=200, help="Number of records for testing dataset")
    
    args = parser.parse_args()
    
    train_count = generate_datasets("data/train", args.train, seed=42)
    print(f"Generated {train_count} records in data/train")
    
    test_count = generate_datasets("data/test", args.test, seed=999)
    print(f"Generated {test_count} records in data/test")

if __name__ == "__main__":
    main()
