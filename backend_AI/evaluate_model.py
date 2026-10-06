# เปรียบเทียบโมเดลแนะนำสถานที่หลายแบบ แบ่งข้อมูลแบบสอบถามจริง 70/20/10 (train/validation/test) ตามผู้ตอบ
#   - train 70%      : ใช้ฝึกโมเดล
#   - validation 20% : ใช้เลือกค่าพารามิเตอร์ที่ดีที่สุดของแต่ละโมเดล
#   - test 10%       : ใช้วัดผลครั้งสุดท้าย (โมเดลไม่เคยเห็นผู้ตอบกลุ่มนี้เลย)
# แบ่งตาม "ผู้ตอบ" ไม่ใช่ตามแถว เพื่อไม่ให้คำตอบของคนเดียวกันอยู่ทั้งฝั่งฝึกและฝั่งทดสอบ
# ข้อมูลเดิมที่ไม่ใช่แบบสอบถาม (ai_dataset ที่ source != survey) ใช้เป็นข้อมูลฝึกอย่างเดียว ไม่นำมาทดสอบ
# test 10% มีแค่ราว 10 คน ผลจากการสุ่มแบ่งครั้งเดียวจึงแกว่งมาก - สุ่มแบ่งซ้ำหลายรอบแล้วรายงานค่าเฉลี่ย ± S.D.
#
# วิธีใช้:  python evaluate_model.py            (สุ่มแบ่ง 30 รอบ)
#           python evaluate_model.py 50         (กำหนดจำนวนรอบเอง)
# ท้ายผลมี paired t-test เทียบโมเดลที่ดีที่สุดกับโมเดลอื่น ว่าความต่างของ top-1 มีนัยสำคัญทางสถิติหรือไม่
import os
import sys
import warnings
from itertools import product

import numpy as np
import pandas as pd
from scipy import stats
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GroupShuffleSplit
from sklearn.naive_bayes import GaussianNB
from sklearn.neighbors import KNeighborsClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import LabelEncoder, OneHotEncoder, OrdinalEncoder, StandardScaler
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier

import convert_survey

warnings.filterwarnings("ignore")
sys.stdout.reconfigure(encoding="utf-8")
os.chdir(os.path.dirname(os.path.abspath(__file__)))

FEATURES = ["budget", "time_hours", "trip_mood", "category"]
N_REPEATS = int(sys.argv[1]) if len(sys.argv) > 1 else 30


def load_other_rows():
    """ข้อมูลฝึกที่ไม่ใช่แบบสอบถาม: อ่านจาก MongoDB (อ่านอย่างเดียว) ถ้าต่อไม่ได้ใช้ dataset.csv แทน"""
    try:
        from dotenv import load_dotenv
        from pymongo import MongoClient
        load_dotenv()
        coll = MongoClient(os.environ["MONGO_URI"], serverSelectionTimeoutMS=5000)["suratthani_tour"]["ai_dataset"]
        rows = list(coll.find({"source": {"$ne": "survey"}}, {"_id": 0}))
        if rows:
            return pd.DataFrame(rows), "MongoDB ai_dataset"
    except Exception:
        pass
    return pd.read_csv("dataset.csv"), "dataset.csv"


def onehot(scale_numbers=True):
    num = StandardScaler() if scale_numbers else "passthrough"
    return ColumnTransformer([("num", num, [0, 1]), ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), [2, 3])])


def ordinal():
    # แบบเดียวกับ main.py: แปลงอารมณ์/หมวดเป็นเลขลำดับด้วย LabelEncoder
    return ColumnTransformer([("num", "passthrough", [0, 1]),
                              ("cat", OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1), [2, 3])])


# ชื่อโมเดล -> (ฟังก์ชันสร้างโมเดลจากพารามิเตอร์, ชุดพารามิเตอร์ที่ลองบน validation)
MODELS = {
    "Random Forest (แบบที่ระบบใช้จริง)": (
        lambda: make_pipeline(ordinal(), RandomForestClassifier(n_estimators=100, random_state=42)), [{}]),
    "Random Forest (ปรับพารามิเตอร์)": (
        lambda n_estimators, max_depth, min_samples_leaf: make_pipeline(onehot(False), RandomForestClassifier(
            n_estimators=n_estimators, max_depth=max_depth, min_samples_leaf=min_samples_leaf, random_state=42)),
        [dict(n_estimators=n, max_depth=d, min_samples_leaf=l) for n, d, l in product([100, 300], [None, 5, 10], [1, 3])]),
    "Decision Tree": (
        lambda max_depth, min_samples_leaf: make_pipeline(onehot(False), DecisionTreeClassifier(
            max_depth=max_depth, min_samples_leaf=min_samples_leaf, random_state=42)),
        [dict(max_depth=d, min_samples_leaf=l) for d, l in product([None, 3, 5, 10], [1, 3, 5])]),
    "K-Nearest Neighbors": (
        lambda n_neighbors, weights: make_pipeline(onehot(), KNeighborsClassifier(n_neighbors=n_neighbors, weights=weights)),
        [dict(n_neighbors=k, weights=w) for k, w in product([3, 5, 10, 20], ["uniform", "distance"])]),
    "Naive Bayes": (
        lambda var_smoothing: make_pipeline(onehot(), GaussianNB(var_smoothing=var_smoothing)),
        [dict(var_smoothing=v) for v in [1e-9, 1e-3, 1e-1]]),
    "Logistic Regression": (
        lambda C: make_pipeline(onehot(), LogisticRegression(C=C, max_iter=2000)),
        [dict(C=c) for c in [0.1, 1, 10]]),
    "SVM (RBF)": (
        lambda C: make_pipeline(onehot(), SVC(C=C, probability=True, random_state=42)),
        [dict(C=c) for c in [1, 10]]),
    "Gradient Boosting": (
        lambda learning_rate, max_depth: make_pipeline(onehot(False), GradientBoostingClassifier(
            learning_rate=learning_rate, max_depth=max_depth, random_state=42)),
        [dict(learning_rate=lr, max_depth=d) for lr, d in product([0.05, 0.1], [2, 3])]),
    "Neural Network (MLP)": (
        lambda hidden: make_pipeline(onehot(), MLPClassifier(hidden_layer_sizes=hidden, max_iter=2000, random_state=42)),
        [dict(hidden=h) for h in [(16,), (32,), (32, 16)]]),
}


def evaluate_ranker(rank_fn, test):
    """top-1 / top-3 ภายในหมวด: สถานที่ที่ผู้ตอบตอบจริงอยู่อันดับ 1 / ติด 3 อันดับแรกของหมวดที่เลือกไหม"""
    top1 = top3 = 0
    for ranked, actual in zip(rank_fn(test), test["place_name"]):
        top1 += ranked[:1] == [actual]
        top3 += actual in ranked[:3]
    return top1 / len(test), top3 / len(test)


def model_ranker(model, cat_of):
    def rank(df):
        proba = model.predict_proba(df[FEATURES].values)
        names = model.classes_
        return [[names[i] for i in np.argsort(-p, kind="stable") if cat_of.get(names[i]) == c]
                for p, c in zip(proba, df["category"])]
    return rank


def popularity_ranker(survey_train, cat_of):
    order = list(survey_train["place_name"].value_counts().index)
    return lambda df: [[p for p in order if cat_of.get(p) == c] for c in df["category"]]


def fit(build, params, train):
    model = build(**params)
    model.fit(train[FEATURES].values, train["place_name"].values)
    return model


def one_split(other, survey, seed):
    groups = survey["_respondent"]
    # ตัด test 10% ก่อน แล้วแบ่งที่เหลือ 90% เป็น train 70 : validation 20 (= 7/9 : 2/9)
    rest_idx, test_idx = next(GroupShuffleSplit(n_splits=1, test_size=0.10, random_state=seed).split(survey, groups=groups))
    rest = survey.iloc[rest_idx]
    tr_idx, val_idx = next(GroupShuffleSplit(n_splits=1, test_size=2 / 9, random_state=seed).split(rest, groups=rest["_respondent"]))
    s_train, s_val, s_test = rest.iloc[tr_idx], rest.iloc[val_idx], survey.iloc[test_idx]

    train = pd.concat([other, s_train])
    train_val = pd.concat([other, s_train, s_val])
    cat_of = dict(zip(train_val["place_name"], train_val["category"]))

    result = {"_sizes": (s_train["_respondent"].nunique(), s_val["_respondent"].nunique(), s_test["_respondent"].nunique(),
                         len(s_train), len(s_val), len(s_test))}
    for name, (build, grid) in MODELS.items():
        # เลือกพารามิเตอร์จาก validation (top-1 ก่อน เสมอกันดู top-3) แล้วฝึกใหม่ด้วย train+validation ก่อนวัดบน test
        best = max(grid, key=lambda p: evaluate_ranker(model_ranker(fit(build, p, train), cat_of), s_val))
        result[name] = evaluate_ranker(model_ranker(fit(build, best, train_val), cat_of), s_test)
    result["Baseline: แนะนำที่ยอดนิยมที่สุด (ไม่ใช้ AI)"] = evaluate_ranker(
        popularity_ranker(pd.concat([s_train, s_val]), cat_of), s_test)
    return result


def main():
    other, source = load_other_rows()
    other = other[FEATURES + ["place_name"]].dropna()
    survey = pd.DataFrame(convert_survey.build(write=False))
    print(f"ข้อมูลแบบสอบถาม: {len(survey)} แถว จากผู้ตอบ {survey['_respondent'].nunique()} คน")
    print(f"ข้อมูลฝึกเพิ่มเติม ({source}): {len(other)} แถว (ใช้ฝึกอย่างเดียว)")
    print(f"สุ่มแบ่ง train/validation/test = 70/20/10 ตามผู้ตอบ จำนวน {N_REPEATS} รอบ\n")

    runs = []
    for seed in range(N_REPEATS):
        runs.append(one_split(other, survey, seed))
        print(f"\r  รอบที่ {seed + 1}/{N_REPEATS}", end="", flush=True)
    print("\n")

    sizes = np.array([r.pop("_sizes") for r in runs])
    print("ขนาดเฉลี่ยต่อรอบ (ผู้ตอบ / แถว): train {:.0f}/{:.0f}  validation {:.0f}/{:.0f}  test {:.0f}/{:.0f}\n".format(
        sizes[:, 0].mean(), sizes[:, 3].mean(), sizes[:, 1].mean(), sizes[:, 4].mean(), sizes[:, 2].mean(), sizes[:, 5].mean()))

    table = []
    for name in runs[0]:
        t1 = np.array([r[name][0] for r in runs]) * 100
        t3 = np.array([r[name][1] for r in runs]) * 100
        table.append({"model": name, "top1_mean": t1.mean(), "top1_sd": t1.std(ddof=1),
                      "top3_mean": t3.mean(), "top3_sd": t3.std(ddof=1)})
    table = pd.DataFrame(table).sort_values(["top1_mean", "top3_mean"], ascending=False)

    print(f"{'โมเดล':<46}{'Top-1 (%)':>18}{'Top-3 (%)':>18}")
    for _, r in table.iterrows():
        print(f"{r['model']:<46}{r['top1_mean']:>10.2f} ± {r['top1_sd']:<5.2f}{r['top3_mean']:>10.2f} ± {r['top3_sd']:<5.2f}")
    table.round(2).to_csv("model_comparison.csv", index=False, encoding="utf-8-sig")
    pd.DataFrame([{name: r[name][0] * 100 for name in r} for r in runs]).round(2).to_csv(
        "model_comparison_runs.csv", index_label="split", encoding="utf-8-sig")
    print("\nบันทึกตารางไว้ที่ model_comparison.csv (ผล top-1 รายรอบ: model_comparison_runs.csv)")

    # paired t-test: เทียบ top-1 ของโมเดลที่ดีที่สุดกับโมเดลอื่นบนชุดแบ่งข้อมูลเดียวกันทีละรอบ
    # ชุด test แต่ละรอบสุ่มจากผู้ตอบกลุ่มเดียวกัน ผลแต่ละรอบจึงไม่อิสระต่อกัน t-test ปกติจะมองโลกในแง่ดีเกินไป
    # จึงรายงาน corrected resampled t-test (Nadeau & Bengio, 2003) ควบคู่ ซึ่งขยายความแปรปรวนด้วย (1/k + n_test/n_train)
    k = len(runs)
    test_train_ratio = sizes[:, 2].mean() / (sizes[:, 0].mean() + sizes[:, 1].mean())
    best = table.iloc[0]["model"]
    best_t1 = np.array([r[best][0] for r in runs]) * 100
    print(f"\nPaired t-test (Top-1) เทียบ {best} กับโมเดลอื่น (k={k} รอบ, n_test/n_train={test_train_ratio:.3f})")
    print(f"{'โมเดล':<46}{'ต่างเฉลี่ย':>10}{'p (ปกติ)':>12}{'p (corrected)':>15}  มีนัยสำคัญที่ 0.05?")
    tests = []
    for name in table["model"][1:]:
        other_t1 = np.array([r[name][0] for r in runs]) * 100
        diff = best_t1 - other_t1
        p_plain = stats.ttest_rel(best_t1, other_t1).pvalue
        var = diff.var(ddof=1)
        t_corr = diff.mean() / np.sqrt((1 / k + test_train_ratio) * var) if var > 0 else np.inf
        p_corr = 2 * stats.t.sf(abs(t_corr), df=k - 1)
        tests.append({"compared_with": name, "mean_diff": diff.mean(), "p_paired": p_plain, "p_corrected": p_corr})
        print(f"{name:<46}{diff.mean():>10.2f}{p_plain:>12.4f}{p_corr:>15.4f}  {'ใช่' if p_corr < 0.05 else 'ไม่'}")
    pd.DataFrame(tests).round(4).to_csv("model_ttest.csv", index=False, encoding="utf-8-sig")
    print("\nบันทึกผล t-test ไว้ที่ model_ttest.csv (ตัดสินนัยสำคัญจาก p corrected)")


if __name__ == "__main__":
    main()
