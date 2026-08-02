/**
 * 헤어샵 리스팅의 로케일별 콘텐츠 — slug 로 키를 잡는다.
 *
 *   - locale content 행(title/description/locationLabel/SEO)은
 *     partner_listing_locale_content 에,
 *   - 매장 정보·가격표 라벨은 details.shopInfoI18n / priceTableI18n 에
 *     저장돼 상세페이지가 현재 로케일 값을 골라 쓴다.
 *
 * 가격표는 '라벨만' 번역한다. 금액은 SEOUL_HAIR_PRODUCTS 의 kr 표가
 * 유일한 출처이고 순서로 매칭하므로, 번역이 낡아도 가격이 어긋나지
 * 않는다 (짝이 없는 항목은 한국어로 남는다).
 */

export type ShopLocale = 'en' | 'zh' | 'ja' | 'ru' | 'vi';

export type ShopLocaleContent = {
  title: string;
  description: string;
  locationLabel: string;
  seoTitle: string;
  seoDescription: string;
  /** details.shopInfoI18n[locale] — 매장 정보 행 + 가격표 각주. */
  shopInfo: {
    station: string;
    services: string;
    priceRange: string;
    hours: string;
    foreignerSupport: string;
    priceNote: string;
  };
  /** details.priceTableI18n[locale] — 그룹명·항목명만 (금액 없음). */
  priceTable: { groups: string[]; items: string[][] };
};

export const HAIR_SHOP_I18N: Record<
  string,
  Partial<Record<ShopLocale, ShopLocaleContent>>
> = {
  'riahn-hair-gangnam-station': {
    en: {
      title: 'Riahn Hair — Gangnam Station',
      description:
        'A one-minute walk from Gangnam Station Exit 3, this is the Gangnam branch of Riahn Hair, a nationwide salon franchise. It holds 4.7 stars across 598 reviews on Kakao Hairshop, one of the larger verified review counts among Gangnam salons. A men’s cut is ₩18,000 and a women’s cut ₩23,000 including shampoo and blow-dry, with perms from ₩25,000 and colour from ₩35,000 — well under the average for major Gangnam franchises. That makes it the value option right in the middle of Gangnam, and a comfortable first stop for visitors who find Cheongdam celebrity salons daunting. Cuts, cold and heat perms (magic straightening and digital), colour, bleach, treatments and blow-dry styling are offered for both men and women, each after a one-to-one consultation with your designer. Note that everything except cuts carries a length surcharge, from ₩20,000 at bob length to ₩40,000 past chest length, so if your hair is long it is worth confirming the total in advance. Book ahead through the Kakao Hairshop app.',
      locationLabel: 'Yeoksam-dong (Gangnam Station)',
      seoTitle: 'Riahn Hair Gangnam | Affordable Seoul Hair Salon | GlowUpTour',
      seoDescription:
        '1 min from Gangnam Station Exit 3. Cuts from ₩18,000, perms from ₩25,000, colour from ₩35,000. 4.7 stars, 598 reviews. Book on GlowUpTour.',
      shopInfo: {
        station: '1 min walk from Gangnam Station Exit 3',
        services:
          'Cut · Cold perm · Heat perm (magic straightening / digital) · Colour · Bleach · Treatment · Blow-dry styling',
        priceRange:
          'Cut from ₩18,000 / Perm from ₩25,000 / Colour from ₩35,000 / Treatment from ₩50,000 (length surcharge ₩20,000–40,000 extra)',
        hours: '10:30–21:30 (last booking varies by service · earlier on weekends and holidays)',
        foreignerSupport: 'Bookable via Kakao Hairshop (ask in advance about English support)',
        priceNote:
          '· The length surcharge reflects the extra skill and time long hair takes, not the amount of product used. Allow about 2 hours up to shoulder length, and about 3.5 hours or more past chest length.\n'
          + '· Past chest length starts at ₩40,000 and can rise further with length.\n'
          + '· Membership prepaid cards — ₩300,000 card +10%, ₩600,000 +15%, ₩900,000 +20% bonus credit, plus 15% off services paid with the card. Valid one year; cuts are excluded from the discount.\n'
          + '· An opening promotion of up to 38% off is running — ask the salon about dates and conditions.\n'
          + '· Switching to premium products can add to the price, and every service may vary with hair length and the products used.',
      },
      priceTable: {
        groups: [
          'CUT — Haircut (shampoo included in every service)',
          'WOMEN’S PERM',
          'WOMEN’S COLOUR — Colour & bleach',
          'MEN’S PERM',
          'MEN’S COLOUR — Colour & bleach',
          'CLINIC — Treatments',
          'DRY — Blow-dry styling',
          'LENGTH SURCHARGE (free at short-cut length · added to services other than cuts)',
        ],
        items: [
          ['Fringe (bang) trim', 'Men’s cut', 'Women’s cut (shampoo + blow-dry included)'],
          [
            'Fringe perm (+₩20,000 for digital)',
            'Cold perm',
            'Root straightening (based on 5 cm)',
            'Digital perm',
            'Magic straightening',
            'Digital magic setting',
          ],
          ['Root colour (based on 3–4 cm)', 'Root bleach', 'Full colour', 'Full bleach'],
          [
            'Down perm (on its own)',
            'Fringe perm',
            'Cut + down perm (list ₩43,000)',
            'Root straightening',
            'Cold perm',
            'Cut + full down perm (list ₩58,000)',
            'Magic straightening',
            'Volume magic',
            'Iron perm',
          ],
          ['Root colour (based on 3–4 cm)', 'Root bleach', 'Full colour', 'Full bleach'],
          [
            'Add-on treatment (with another service)',
            'Basic 3-step (basic care)',
            'Basic 6-step (repair care)',
            'Premium treatment (premium repair care)',
          ],
          ['Blow-dry styling', 'Iron styling'],
          ['Bob length', 'Shoulder length', 'Below chest length'],
        ],
      },
    },

    zh: {
      title: 'RIAHN HAIR 江南站店',
      description:
        '距江南站3号出口步行1分钟，是全国连锁美发品牌 RIAHN HAIR 的江南站分店。在 Kakao Hairshop 上获得4.7分、598条真实评价，是江南地区评价数量较为可靠的美发店之一。男士剪发 ₩18,000、女士剪发 ₩23,000（含洗发与吹干），烫发 ₩25,000起、染发 ₩35,000起，低于江南主要连锁品牌的平均价格。对于觉得清潭洞明星沙龙门槛较高的首次到访客人来说，这里是位于江南核心地段的高性价比选择。剪发、普通烫、热烫（离子烫／数码烫）、染发、漂发、护理及吹风造型等男女全项目，均由发型师一对一咨询后施作。需注意，除剪发外的项目会按发长加收 ₩20,000（齐下巴）至 ₩40,000（胸线以下）的费用，头发较长时建议提前确认总价。可通过 Kakao Hairshop 应用提前预约。',
      locationLabel: '驿三洞（江南站）',
      seoTitle: 'RIAHN HAIR 江南站店 | 江南高性价比美发 | GlowUpTour',
      seoDescription:
        '江南站3号出口步行1分钟。剪发 ₩18,000起、烫发 ₩25,000起、染发 ₩35,000起。Kakao Hairshop 4.7分·598条评价。在 GlowUpTour 预约。',
      shopInfo: {
        station: '江南站3号出口步行1分钟',
        services: '剪发 · 普通烫 · 热烫（离子烫·数码烫）· 染发 · 漂发 · 头发护理 · 吹风造型',
        priceRange:
          '剪发 ₩18,000起 / 烫发 ₩25,000起 / 染发 ₩35,000起 / 护理 ₩50,000起（长度附加费 ₩20,000~40,000 另计）',
        hours: '10:30~21:30（各项目最晚预约时间不同 · 周末及节假日提前结束）',
        foreignerSupport: '可通过 Kakao Hairshop 预约（英语服务请提前咨询）',
        priceNote:
          '· 长度附加费并非药剂用量的差异，而是技术与耗时的差价。齐肩以内约需2小时，胸线以下约需3小时30分以上。\n'
          + '· 胸线以下自 ₩40,000 起，并会随发长继续增加。\n'
          + '· 会员储值卡 — 30万韩元卡 +10%、60万 +15%、90万 +20% 额外积分，使用储值卡消费再享15%折扣。有效期1年，剪发不参与折扣。\n'
          + '· 开业活动最高38%折扣进行中 — 适用期间及条件请咨询门店。\n'
          + '· 更换为高级产品可能产生额外费用，所有项目价格可能因发长与所用产品而变动。',
      },
      priceTable: {
        groups: [
          'CUT — 剪发（所有项目含洗发）',
          'WOMEN’S PERM — 女士烫发',
          'WOMEN’S COLOR — 女士染发·漂发',
          'MEN’S PERM — 男士烫发',
          'MEN’S COLOR — 男士染发·漂发',
          'CLINIC — 头发护理',
          'DRY — 吹风造型',
          '长度附加费（短发为0元 · 除剪发外的项目另加）',
        ],
        items: [
          ['刘海修剪', '男士剪发', '女士剪发（含洗发 + 吹干）'],
          [
            '刘海烫（数码烫加 ₩20,000）',
            '普通烫',
            '发根离子烫（以5cm为准）',
            '数码烫',
            '离子烫',
            '数码离子烫定型',
          ],
          ['补染发根（以3~4cm为准）', '发根漂发', '全头染发', '全头漂发'],
          [
            '塌发烫（单项）',
            '刘海烫',
            '剪发 + 塌发烫（原价 ₩43,000）',
            '发根离子烫',
            '普通烫',
            '剪发 + 全头塌发烫（原价 ₩58,000）',
            '离子烫',
            '蓬松离子烫',
            '夹板烫',
          ],
          ['补染发根（以3~4cm为准）', '发根漂发', '全头染发', '全头漂发'],
          [
            '搭配其他项目加做护理',
            '基础3阶段（基础护理）',
            '基础6阶段（修复护理）',
            '高级护理（高级修复护理）',
          ],
          ['吹风造型', '夹板造型'],
          ['齐下巴（短发）', '齐肩', '胸线以下'],
        ],
      },
    },

    ja: {
      title: 'リアンヘア 江南駅店',
      description:
        '江南（カンナム）駅3番出口から徒歩1分、全国展開のヘアサロンチェーン「リアンヘア」の江南駅店。Kakao Hairshop で4.7点・598件のレビューを持ち、江南エリアでも検証済みレビュー数の多いサロンのひとつです。メンズカット ₩18,000、レディースカット ₩23,000（シャンプー・ブロー込み）、パーマ ₩25,000～、カラー ₩35,000～ と、江南の主要チェーン平均より手頃。清潭洞のセレブサロンは敷居が高いと感じる初訪問の方に向いた、江南中心部のコスパ重視の選択肢です。カット、普通パーマ、熱パーマ（縮毛矯正・デジタル）、カラー、ブリーチ、トリートメント、ブロースタイリングまでメンズ・レディース全メニューを、担当デザイナーとのマンツーマン カウンセリングで進めます。ただしカット以外は髪の長さに応じて ₩20,000（ボブ）～₩40,000（胸下）が加算されるため、髪が長い方は事前に総額の確認をおすすめします。Kakao Hairshop アプリから事前予約が可能です。',
      locationLabel: '駅三洞（江南駅）',
      seoTitle: 'リアンヘア江南駅店 | 江南のコスパ美容室 | GlowUpTour',
      seoDescription:
        '江南駅3番出口から徒歩1分。カット ₩18,000～、パーマ ₩25,000～、カラー ₩35,000～。4.7点・598件のレビュー。GlowUpTour で予約。',
      shopInfo: {
        station: '江南（カンナム）駅3番出口から徒歩1分',
        services:
          'カット · 普通パーマ · 熱パーマ（縮毛矯正・デジタル）· カラー · ブリーチ · トリートメント · ブロー スタイリング',
        priceRange:
          'カット ₩18,000～ / パーマ ₩25,000～ / カラー ₩35,000～ / トリートメント ₩50,000～（長さ追加料金 ₩20,000～40,000 別途）',
        hours: '10:30～21:30（メニューごとに予約締切が異なります · 土日祝は早めに終了）',
        foreignerSupport: 'Kakao Hairshop から予約可能（英語対応は事前にお問い合わせください）',
        priceNote:
          '· 長さの追加料金は薬剤の量ではなく、技術と所要時間の差によるものです。肩までは約2時間、胸下は約3時間30分以上かかります。\n'
          + '· 胸下の長さは ₩40,000 からで、長さによってさらに上がる場合があります。\n'
          + '· メンバーシップ回数券 — 30万ウォン券 +10%、60万ウォン券 +15%、90万ウォン券 +20% を追加チャージ。回数券での施術はさらに15%割引。有効期限1年、カットは割引対象外。\n'
          + '· オープン記念で最大38%割引を実施中 — 適用期間・条件は店舗にお問い合わせください。\n'
          + '· プレミアム製品に変更すると追加料金が発生する場合があり、すべてのメニューは髪の長さや使用製品によって価格が変動することがあります。',
      },
      priceTable: {
        groups: [
          'CUT — カット（全メニュー シャンプー込み）',
          'WOMEN’S PERM — レディース パーマ',
          'WOMEN’S COLOR — レディース カラー・ブリーチ',
          'MEN’S PERM — メンズ パーマ',
          'MEN’S COLOR — メンズ カラー・ブリーチ',
          'CLINIC — トリートメント',
          'DRY — ブロー スタイリング',
          '長さ追加料金（ショート基準0ウォン · カット以外のメニューに加算）',
        ],
        items: [
          ['前髪カット', 'メンズ カット', 'レディース カット（シャンプー + ブロー込み）'],
          [
            '前髪パーマ（デジタルパーマは +₩20,000）',
            '普通パーマ',
            '根元縮毛矯正（5cm基準）',
            'デジタルパーマ',
            '縮毛矯正',
            'デジタル縮毛矯正セッティング',
          ],
          ['リタッチカラー（3～4cm基準）', '根元ブリーチ', '全体カラー', '全体ブリーチ'],
          [
            'ダウンパーマ（単品）',
            '前髪パーマ',
            'カット + ダウンパーマ（定価 ₩43,000）',
            '根元縮毛矯正',
            '普通パーマ',
            'カット + 全体ダウンパーマ（定価 ₩58,000）',
            '縮毛矯正',
            'ボリューム矯正',
            'アイロンパーマ',
          ],
          ['リタッチカラー（3～4cm基準）', '根元ブリーチ', '全体カラー', '全体ブリーチ'],
          [
            '施術追加トリートメント',
            'ベーシック3ステップ（ベーシックケア）',
            'ベーシック6ステップ（リペアケア）',
            'プレミアム トリートメント（プレミアム リペアケア）',
          ],
          ['ブロー スタイリング', 'アイロン スタイリング'],
          ['ボブ（あご）ライン', '肩ライン', '胸下ライン以上'],
        ],
      },
    },

    ru: {
      title: 'Riahn Hair — Каннам',
      description:
        'В одной минуте ходьбы от выхода 3 станции Каннам — филиал Riahn Hair, общенациональной сети парикмахерских. Рейтинг 4,7 и 598 отзывов на Kakao Hairshop: одно из самых больших количеств проверенных отзывов среди салонов Каннама. Мужская стрижка стоит ₩18,000, женская — ₩23,000 вместе с мытьём и укладкой, завивка от ₩25,000, окрашивание от ₩35,000, что заметно ниже среднего по крупным сетям Каннама. Это выгодный вариант в самом центре Каннама и спокойный первый визит для тех, кому салоны знаменитостей в Чхондаме кажутся слишком дорогими. Стрижки, химическая и термозавивка (кератиновое выпрямление и цифровая), окрашивание, осветление, уходы и укладка феном доступны и мужчинам, и женщинам — всё после личной консультации с мастером. Учтите: на всё, кроме стрижки, действует доплата за длину — от ₩20,000 при длине до подбородка до ₩40,000 ниже груди, поэтому при длинных волосах стоит заранее уточнить итоговую сумму. Записаться можно через приложение Kakao Hairshop.',
      locationLabel: 'Ёксам-дон (ст. Каннам)',
      seoTitle: 'Riahn Hair Каннам | Доступный салон в Сеуле | GlowUpTour',
      seoDescription:
        '1 минута от выхода 3 ст. Каннам. Стрижка от ₩18,000, завивка от ₩25,000, окрашивание от ₩35,000. Рейтинг 4,7, 598 отзывов. Бронь на GlowUpTour.',
      shopInfo: {
        station: '1 минута пешком от станции Каннам, выход 3',
        services:
          'Стрижка · Химическая завивка · Термозавивка (кератиновое выпрямление / цифровая) · Окрашивание · Осветление · Уход · Укладка феном',
        priceRange:
          'Стрижка от ₩18,000 / Завивка от ₩25,000 / Окрашивание от ₩35,000 / Уход от ₩50,000 (доплата за длину ₩20,000–40,000 отдельно)',
        hours: '10:30–21:30 (время последней записи зависит от услуги · в выходные и праздники раньше)',
        foreignerSupport: 'Запись через Kakao Hairshop (об английском уточняйте заранее)',
        priceNote:
          '· Доплата за длину — это разница в мастерстве и времени, а не в количестве состава. До плеч уходит около 2 часов, ниже груди — от 3,5 часов.\n'
          + '· Длина ниже груди — от ₩40,000, сумма растёт вместе с длиной.\n'
          + '· Абонементы — карта на ₩300,000 даёт +10%, на ₩600,000 +15%, на ₩900,000 +20% бонусом, плюс скидка 15% при оплате картой. Срок действия 1 год, стрижки без скидки.\n'
          + '· Действует акция в честь открытия — до 38%; сроки и условия уточняйте в салоне.\n'
          + '· Переход на премиальные средства может увеличить стоимость; цена любой услуги зависит от длины волос и используемых средств.',
      },
      priceTable: {
        groups: [
          'CUT — Стрижка (мытьё головы включено во все услуги)',
          'WOMEN’S PERM — Женская завивка',
          'WOMEN’S COLOR — Женское окрашивание и осветление',
          'MEN’S PERM — Мужская завивка',
          'MEN’S COLOR — Мужское окрашивание и осветление',
          'CLINIC — Уход за волосами',
          'DRY — Укладка феном',
          'ДОПЛАТА ЗА ДЛИНУ (при короткой стрижке — 0 · добавляется ко всем услугам, кроме стрижки)',
        ],
        items: [
          ['Стрижка чёлки', 'Мужская стрижка', 'Женская стрижка (мытьё + укладка феном)'],
          [
            'Завивка чёлки (+₩20,000 за цифровую)',
            'Химическая завивка',
            'Выпрямление корней (до 5 см)',
            'Цифровая завивка',
            'Кератиновое выпрямление',
            'Цифровая завивка с выпрямлением',
          ],
          [
            'Окрашивание корней (до 3–4 см)',
            'Осветление корней',
            'Окрашивание по всей длине',
            'Осветление по всей длине',
          ],
          [
            'Даун-перм (отдельно)',
            'Завивка чёлки',
            'Стрижка + даун-перм (прайс ₩43,000)',
            'Выпрямление корней',
            'Химическая завивка',
            'Стрижка + полный даун-перм (прайс ₩58,000)',
            'Кератиновое выпрямление',
            'Прикорневой объём',
            'Завивка утюжком',
          ],
          [
            'Окрашивание корней (до 3–4 см)',
            'Осветление корней',
            'Окрашивание по всей длине',
            'Осветление по всей длине',
          ],
          [
            'Уход в дополнение к другой услуге',
            'Базовый 3-ступенчатый (basic care)',
            'Базовый 6-ступенчатый (repair care)',
            'Премиальный уход (premium repair care)',
          ],
          ['Укладка феном', 'Укладка утюжком'],
          ['До подбородка (боб)', 'До плеч', 'Ниже груди'],
        ],
      },
    },

    vi: {
      title: 'Riahn Hair — Chi nhánh ga Gangnam',
      description:
        'Cách lối ra số 3 ga Gangnam một phút đi bộ, đây là chi nhánh ga Gangnam của Riahn Hair, chuỗi salon tóc có mặt trên toàn Hàn Quốc. Salon đạt 4,7 sao với 598 đánh giá trên Kakao Hairshop — một trong những lượng đánh giá đã xác thực lớn nhất khu Gangnam. Cắt tóc nam ₩18,000, cắt tóc nữ ₩23,000 (đã gồm gội và sấy), uốn từ ₩25,000, nhuộm từ ₩35,000, thấp hơn mức trung bình của các chuỗi lớn ở Gangnam. Đây là lựa chọn hợp túi tiền ngay giữa Gangnam, phù hợp cho khách lần đầu thấy các salon ngôi sao ở Cheongdam quá đắt đỏ. Cắt tóc, uốn lạnh, uốn nhiệt (duỗi/uốn kỹ thuật số), nhuộm, tẩy, hấp phục hồi và sấy tạo kiểu đều có cho cả nam và nữ, thực hiện sau khi tư vấn riêng với nhà tạo mẫu. Lưu ý mọi dịch vụ ngoài cắt tóc đều có phụ phí độ dài, từ ₩20,000 (ngang cằm) đến ₩40,000 (dài quá ngực), nên nếu tóc dài bạn hãy hỏi trước tổng chi phí. Có thể đặt lịch trước qua ứng dụng Kakao Hairshop.',
      locationLabel: 'Yeoksam-dong (ga Gangnam)',
      seoTitle: 'Riahn Hair ga Gangnam | Salon giá tốt ở Gangnam | GlowUpTour',
      seoDescription:
        'Cách lối ra 3 ga Gangnam 1 phút. Cắt từ ₩18,000, uốn từ ₩25,000, nhuộm từ ₩35,000. 4,7 sao · 598 đánh giá. Đặt lịch tại GlowUpTour.',
      shopInfo: {
        station: 'Đi bộ 1 phút từ lối ra số 3 ga Gangnam',
        services:
          'Cắt tóc · Uốn lạnh · Uốn nhiệt (duỗi · uốn kỹ thuật số) · Nhuộm · Tẩy · Hấp phục hồi · Sấy tạo kiểu',
        priceRange:
          'Cắt từ ₩18,000 / Uốn từ ₩25,000 / Nhuộm từ ₩35,000 / Hấp phục hồi từ ₩50,000 (phụ phí độ dài ₩20,000–40,000 tính riêng)',
        hours: '10:30–21:30 (giờ nhận khách cuối khác nhau theo dịch vụ · cuối tuần và ngày lễ đóng sớm hơn)',
        foreignerSupport: 'Đặt lịch qua Kakao Hairshop (vui lòng hỏi trước về hỗ trợ tiếng Anh)',
        priceNote:
          '· Phụ phí độ dài phản ánh kỹ thuật và thời gian, không phải lượng thuốc. Tóc ngang vai mất khoảng 2 tiếng, dài quá ngực khoảng 3 tiếng 30 phút trở lên.\n'
          + '· Từ độ dài quá ngực, phụ phí bắt đầu từ ₩40,000 và tăng theo độ dài.\n'
          + '· Thẻ trả trước — thẻ ₩300,000 tặng thêm 10%, ₩600,000 tặng 15%, ₩900,000 tặng 20%; thanh toán bằng thẻ được giảm thêm 15%. Hạn dùng 1 năm, không áp dụng giảm giá cho cắt tóc.\n'
          + '· Đang có khuyến mãi khai trương giảm tới 38% — vui lòng hỏi salon về thời gian và điều kiện.\n'
          + '· Đổi sang sản phẩm cao cấp có thể phát sinh thêm chi phí; giá mọi dịch vụ có thể thay đổi tùy độ dài tóc và sản phẩm sử dụng.',
      },
      priceTable: {
        groups: [
          'CUT — Cắt tóc (mọi dịch vụ đã gồm gội đầu)',
          'WOMEN’S PERM — Uốn nữ',
          'WOMEN’S COLOR — Nhuộm & tẩy nữ',
          'MEN’S PERM — Uốn nam',
          'MEN’S COLOR — Nhuộm & tẩy nam',
          'CLINIC — Hấp phục hồi',
          'DRY — Sấy tạo kiểu',
          'PHỤ PHÍ ĐỘ DÀI (tóc ngắn miễn phí · cộng thêm cho dịch vụ ngoài cắt tóc)',
        ],
        items: [
          ['Cắt mái', 'Cắt tóc nam', 'Cắt tóc nữ (gồm gội + sấy)'],
          [
            'Uốn mái (uốn kỹ thuật số +₩20,000)',
            'Uốn lạnh',
            'Duỗi chân tóc (tính theo 5cm)',
            'Uốn kỹ thuật số',
            'Duỗi tóc',
            'Duỗi uốn kỹ thuật số',
          ],
          ['Nhuộm chân tóc (tính theo 3~4cm)', 'Tẩy chân tóc', 'Nhuộm toàn đầu', 'Tẩy toàn đầu'],
          [
            'Ép cụp (riêng lẻ)',
            'Uốn mái',
            'Cắt + ép cụp (giá gốc ₩43,000)',
            'Duỗi chân tóc',
            'Uốn lạnh',
            'Cắt + ép cụp toàn đầu (giá gốc ₩58,000)',
            'Duỗi tóc',
            'Duỗi phồng chân tóc',
            'Uốn phồng bằng máy',
          ],
          ['Nhuộm chân tóc (tính theo 3~4cm)', 'Tẩy chân tóc', 'Nhuộm toàn đầu', 'Tẩy toàn đầu'],
          [
            'Hấp thêm khi làm dịch vụ khác',
            'Cơ bản 3 bước (chăm sóc cơ bản)',
            'Cơ bản 6 bước (phục hồi)',
            'Hấp cao cấp (phục hồi cao cấp)',
          ],
          ['Sấy tạo kiểu', 'Tạo kiểu bằng máy ép'],
          ['Ngang cằm', 'Ngang vai', 'Dài quá ngực'],
        ],
      },
    },
  },
};
