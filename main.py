import numpy as np
import pandas as pd
from matplotlib import pyplot as plt

#日本語対応、なければスキップ
try:
    import matplotlib_fontja
except ImportError:
    print("plz install 'matplotlib-fontja'")

subjects = ["国語","数学","社会","理科","英語"]
numbers = ["一回","二回","三回","四回","五回"]
colors = ["red", "blue", "green", "orange", "purple"]
fig,axes = plt.subplots(3,5,figsize=(20,8))
#エクセルファイルの名前はBook1がいいです
try:
    df = pd.read_excel("Book1.xlsx")
except FileNotFoundError:
    print("plz name the file 'Book1'")

#変動する可能性がある、テストに関するデータの定義
total_score_max = 500 #テスト総合点の最大値
subject_score_max = 100 #一教科ごとの点数の最大値
score_separete = 20 #グラフの縦の区切りの頻度
df["総合点"] = df[subjects].sum(axis=1) #axis=1→横方向と指定(行)0の場合は縦(列)となる

#axesを一次元配列として取得
axes_flat = axes.flatten()

#上側・全五回、5教科の点数推移グラフ.plot
for i, subj in enumerate(subjects):
    ax = axes_flat[i]
    ax.plot(
            numbers,
            df[subj],
            marker="o",
            color=colors[i],
            label="得点"
            )
    average = df[subj].mean()
    ax.axhline(
                average,
                color="gray",
                linestyle="--",
                label =f"五回の平均:{average:.1f}"
            )
    ax.set_title(subj)
    ax.grid(True)
    ax.set_ylim(0,100)
    ax.legend(loc="lower left",frameon=True)#ラベルを左下に。ラベルを囲うをありに。判例(label)の枠線をアリに。
    ax.set_yticks(np.arange(0,subject_score_max + 1,score_separete))

#テストごとに、どの教科が得点の何％を占めているか.pie
for i in range(len(numbers)):
    row_data = df.loc[i,subjects]
    ax = axes_flat[i + 5]
    ax.pie(
        row_data,
        labels=subjects,
        colors=colors,
        autopct='%1.1f%%',
        startangle=90,
        counterclock=False
    )
    ax.set_title(f"第{i + 1}回\n合計点:{df["総合点"].iloc[i]}")
#(2,1)全五回の、総合展の推移を線グラフで
ax_total_place = axes_flat[10]

ax_total_place.plot(
                    numbers,
                    df["総合点"],
                    marker="D",
                    color="black",
                    linewidth=2,
                    label="総合点"
)
total_ave = df["総合点"].mean()
ax_total_place.axhline(
                        total_ave,
                        color="gray",
                        linestyle="--",
                        label=f"平均:{total_ave:.1f}"
)
ax_total_place.set_title("5教科合計点の推移")
ax_total_place.set_ylim(0,total_score_max)
ax_total_place.grid(True)
ax_total_place.legend()


# --- 11: 教科別平均点ランキング（横棒グラフ） ---
ax11 = axes_flat[11]
subj_avg = df[subjects].mean().sort_values() # 平均が低い順にソート
ax11.barh(subj_avg.index, subj_avg.values, color="skyblue")
ax11.set_title("教科別平均点の大きさ")
ax11.set_xlim(0, subject_score_max)
ax11.grid(axis='x', linestyle='--', alpha=0.7)

# --- 12: 得意・苦手分析（最高と最低の差） ---
ax12 = axes_flat[12]
# 各教科の(最大値 - 最小値)を計算して、得点の変動幅（安定度）を見る
subj_range = df[subjects].max() - df[subjects].min()
ax12.bar(subjects, subj_range, color="lightcoral")
ax12.set_title("教科別の得点変動幅\n(最大-最小)")
ax12.set_ylabel("点数差")
ax12.set_ylim(0, subject_score_max) # 差が100点以上のことはないので

# --- 13: 最新回（第五回）の得点分布 ---
ax13 = axes_flat[13]
latest_scores = df[subjects].iloc[-1] # -1は「第五回」のインデックス
ax13.bar(subjects, latest_scores, color=colors)
ax13.set_title("最新回(第五回)の得点")
ax13.set_ylim(0, 100)
for j, v in enumerate(latest_scores):
    ax13.text(j, v + 2, str(v), ha='center') # 棒の上に点数を表示

# --- 14:　全スコアのばらつきを箱ひげ図で ---
ax14 = axes_flat[14]
# .values.flatten() で全点数を一つのリストにして渡す
ax14.boxplot(df[subjects].values.flatten()) 
ax14.set_xticklabels(["全教科"]) 
ax14.set_title("全スコアのバラつき")
ax14.set_ylim(0, 100)
ax14.grid(True, axis='y')


fig.tight_layout()
fig.savefig("plot.png")#画像データとして保存。
plt.show()
