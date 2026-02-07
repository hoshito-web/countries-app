let allCountries = [];//APIから取得した すべての国「元データ」「マスター」
let currentList = [];//検索・地域・並び替え後の 表示用リスト

// 🇯🇵 日本語名マップ（定数）
const jpNameMap = {
  Japan: '日本',
  Germany: 'ドイツ',
  France: 'フランス',
  Italy: 'イタリア',
  Spain: 'スペイン',
  China: '中国',
  'South Korea': '韓国',
  'United States': 'アメリカ',
  'United Kingdom': 'イギリス',
  Canada: 'カナダ',
  Australia: 'オーストラリア',
};

const countryList = document.getElementById('country-list');
const searchInput = document.getElementById('search');
const sortBtn = document.getElementById('sort');
const modal = document.getElementById('modal');
const modalBody = document.getElementById('modal-body');
const closeBtn = document.getElementById('close');
const regionSelect = document.getElementById('region');
const favoriteOnlyCheckbox = document.getElementById('fav-only');

async function fetchCountries() {
  try {
    const res = await fetch('https://restcountries.com/v3.1/all?fields=name,population,region,flags,capital,languages,currencies');//APIにアクセス

    if (!res.ok) {
      throw new Error('HTTPエラー: ' + res.status);//エラーチェック
    }

    const countries = await res.json();//JSONに変換

    if (!Array.isArray(countries)) {
      throw new Error('APIが配列を返していません');
    }

    allCountries = countries.map(country => ({//画面描画
      ...country,
      isFavorite: false
    }));

    //復元処理
    currentList = allCountries;

    loadFavorites();
    render(currentList);
    updateFavoriteCount();//お気に入り復元
  } catch (err) {
    console.error(err);
    alert('国データの取得に失敗しました');
  }
}

//「配列 → HTML」変換装置
//isFavorite === true → ★false / undefined → ☆
//状態がUIを決めてる
function render(list) {
  if (list.length === 0) {
    //お気に入りが1件もない状態
    if (showOnlyFavorite && !allCountries.some(c => c.isFavorite)) {
      countryList.innerHTML = `
       <li class="empty">
         <p>お気に入りがまだありません</p>
         <small>★を押して登録してみましょう</small>
       </li>
    `;
      return;
    }

    //「検索ヒット0件」のとき専用メッセージを出す
    countryList.innerHTML = `
      <li class="empty">
        <p>該当する国がありません</p>
        <small>検索条件を変更してみてください</small>
      </li>
     `;
    return;
  }

  countryList.innerHTML = list
    .map(country => {
      const index = allCountries.findIndex(
        c => c.name.common === country.name.common
      );

      return `
        <li data-index="${index}">
          <button class="fav-btn">
            ${country.isFavorite ? '★' : '☆'}
          </button>
          <img src="${country.flags.png}">
          <div class="info">
            <strong>${country.name.common}</strong>
            <span>${country.population?.toLocaleString() ?? '不明'}</span>
          </div>
        </li>
      `;
    })
    .join('');
}

//お気に入りを保存する関数
function saveFavorites() {
  const favorites = allCountries
    .filter(country => country.isFavorite)
    .map(country => country.name.common);

  localStorage.setItem(
    'favorites',
    JSON.stringify(favorites)
  );
}

//お気に入りを復元する関数
function loadFavorites() {
  const data = localStorage.getItem('favorites');
  if (!data) return;

  const favorites = JSON.parse(data);

  allCountries.forEach(country => {
    country.isFavorite = favorites.includes(country.name.common);
  });
}

//お気に入り数を更新する関数
function updateFavoriteCount() {
  const count = allCountries.filter(c => c.isFavorite).length;
  const el = document.querySelector('.fav-count');//DOMが無いときの保険
  if (!el) return;
  el.textContent = count;
}

//クリック処理（イベント委譲）
//★を押したか？
//closest → 親方向に探す
countryList.addEventListener('click', (e) => {
  const favBtn = e.target.closest('.fav-btn');
  if (favBtn) {
    const li = favBtn.closest('li');
    const index = Number(li.dataset.index);
    const country = allCountries[index];

    if (!country) {
      console.error('⚠ 国が見つかっていない');
      return;
    }

    country.isFavorite = !country.isFavorite;

    console.log(
      'お気に入り数:',
      allCountries.filter(c => c.isFavorite).length
    );

    saveFavorites();
    applyFilters();
    updateFavoriteCount();
    return;
  }

  const li = e.target.closest('li');
  if (!li) return;
  //カードクリックの場合data-index → 配列のindex
  showDetail(Number(li.dataset.index));
});

//モーダル表示
//必ず currentList を使う
function showDetail(index) {
  const country = allCountries[index];
  if (!country) return;//保険

  const currencyObj = Object.values(country.currencies ?? {})[0];//通貨はオブジェクト,最初の1つだけ取得
  const currencyText = currencyObj
    ? `${currencyObj.name} (${currencyObj.symbol ?? ''})`//?? {} で undefined 対策
    : '不明';

  modalBody.innerHTML = `
        <h2> ${country.name.common}</h2>
          <img src="${country.flags.png}">
            <p>人口: ${country.population?.toLocaleString() ?? '不明'}</p>
            <p>地域: ${country.region}</p>
            <p>首都: ${country.capital?.[0] ?? '不明'}</p>
            <p>言語: ${Object.values(country.languages ?? {}).join(', ') || '不明'}</p>
            <p>通貨: ${currencyText}</p>
            `;

  modal.classList.add('show');
}

closeBtn.addEventListener('click', () => {
  modal.classList.remove('show');
});

//フィルター設計
//UIの状態を全部変数で持つ
//条件
let keyword = '';
let selectedRegion = 'all';
let isDesc = true;
let showOnlyFavorite = false;

function applyFilters() {
  let list = [...allCountries];

  //国名検索
  if (keyword) {
    list = list.filter(country => {
      const en = country.name.common.toLowerCase();
      const jp = jpNameMap[country.name.common] ?? '';

      return (
        en.includes(keyword) ||
        jp.includes(keyword)
      );
    });
  }

  //地域フィルター
  if (selectedRegion !== 'all') {
    list = list.filter(country =>
      country.region === selectedRegion
    );
  }

  //お気に入りフィルター
  if (showOnlyFavorite) {
    list = list.filter(country => country.isFavorite);
  }

  //並び替え
  list.sort((a, b) =>
    isDesc ? b.population - a.population : a.population - b.population);

  currentList = list;
  render(currentList);
}

searchInput.addEventListener('input', () => {
  keyword = searchInput.value.toLowerCase();
  applyFilters();
});

regionSelect.addEventListener('change', () => {
  selectedRegion = regionSelect.value;
  applyFilters();
});

sortBtn.addEventListener('click', () => {
  isDesc = !isDesc;
  sortBtn.textContent = isDesc ? '人口が多い順' : '人口が少ない順';
  applyFilters();
});

favoriteOnlyCheckbox.addEventListener('change', () => {
  showOnlyFavorite = favoriteOnlyCheckbox.checked;//UIの状態を読む

  document.body.classList.toggle(
    'favorite-mode',
    showOnlyFavorite
  );
  // console.log('checked:', showOnlyFavorite);
  applyFilters();//状態が変わったので再計算
});

function resetFilters() {
  keyword = '';
  selectedRegion = 'all';
  isDesc = true;
  showOnlyFavorite = false;

  searchInput.value = '';
  regionSelect.value = 'all';
  sortBtn.textContent = '人口が多い順';
  favoriteOnlyCheckbox.checked = false;

  document.body.classList.remove('favorite-mode');
  applyFilters();
}

document.getElementById('reset').addEventListener('click', () => {
  resetFilters();
});

console.log(favoriteOnlyCheckbox);

fetchCountries();