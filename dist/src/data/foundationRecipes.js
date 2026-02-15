export const FOUNDATION_RECIPES = [
    {
        id: "r_egg_tomato",
        title: "番茄炒蛋",
        cuisine: "Chinese Home",
        servings: 2,
        cookMinutes: 12,
        ingredients: [
            { ingredientKey: "egg", nameZh: "鸡蛋", nameEn: "egg", quantity: 3, unit: "piece" },
            { ingredientKey: "tomato", nameZh: "番茄", nameEn: "tomato", quantity: 2, unit: "piece" },
            { ingredientKey: "scallion", nameZh: "青葱", nameEn: "scallion", quantity: 1, unit: "piece", optional: true },
            { ingredientKey: "soy_sauce", nameZh: "生抽", nameEn: "light soy sauce", quantity: 1, unit: "tbsp", optional: true }
        ],
        steps: [
            "番茄切块，鸡蛋打散。",
            "热锅炒蛋至凝固后盛出。",
            "番茄下锅炒软，加入鸡蛋回锅，调味后出锅。"
        ],
        tags: ["quick", "budget", "no-spicy"],
        substitutions: []
    },
    {
        id: "r_kungpao_chicken",
        title: "宫保鸡丁",
        cuisine: "Sichuan",
        servings: 2,
        cookMinutes: 20,
        ingredients: [
            { ingredientKey: "chicken_thigh", nameZh: "鸡腿肉", nameEn: "chicken thigh", quantity: 300, unit: "g" },
            { ingredientKey: "chili", nameZh: "辣椒", nameEn: "chili", quantity: 3, unit: "piece" },
            { ingredientKey: "garlic", nameZh: "大蒜", nameEn: "garlic", quantity: 3, unit: "piece" },
            { ingredientKey: "ginger", nameZh: "姜", nameEn: "ginger", quantity: 10, unit: "g" },
            { ingredientKey: "soy_sauce", nameZh: "生抽", nameEn: "light soy sauce", quantity: 1, unit: "tbsp" },
            { ingredientKey: "shaoxing_wine", nameZh: "料酒", nameEn: "shaoxing wine", quantity: 1, unit: "tbsp" }
        ],
        steps: [
            "鸡腿肉切丁腌制。",
            "炒香姜蒜辣椒，加入鸡丁翻炒。",
            "加生抽和料酒收汁。"
        ],
        tags: ["quick", "spicy", "high-protein"],
        substitutions: [
            {
                ingredientKey: "shaoxing_wine",
                markets: ["NZ", "AU"],
                alternatives: [
                    {
                        ingredientKey: "dry_sherry",
                        nameZh: "干雪利酒",
                        nameEn: "dry sherry",
                        note: "可在本地超市酒类货架购买"
                    }
                ]
            }
        ]
    },
    {
        id: "r_mapo_tofu",
        title: "麻婆豆腐",
        cuisine: "Sichuan",
        servings: 2,
        cookMinutes: 18,
        ingredients: [
            { ingredientKey: "tofu_firm", nameZh: "北豆腐", nameEn: "firm tofu", quantity: 400, unit: "g" },
            { ingredientKey: "ground_beef", nameZh: "牛肉末", nameEn: "ground beef", quantity: 120, unit: "g" },
            { ingredientKey: "doubanjiang", nameZh: "郫县豆瓣酱", nameEn: "doubanjiang", quantity: 1, unit: "tbsp" },
            { ingredientKey: "garlic", nameZh: "大蒜", nameEn: "garlic", quantity: 2, unit: "piece" },
            { ingredientKey: "scallion", nameZh: "青葱", nameEn: "scallion", quantity: 1, unit: "piece", optional: true }
        ],
        steps: [
            "豆腐切块焯水。",
            "炒香肉末与豆瓣酱。",
            "加入豆腐炖煮，最后收汁。"
        ],
        tags: ["spicy", "rice-friendly", "quick"],
        substitutions: [
            {
                ingredientKey: "doubanjiang",
                markets: ["NZ", "AU"],
                alternatives: [
                    {
                        ingredientKey: "chili_bean_paste",
                        nameZh: "辣豆瓣酱",
                        nameEn: "chili bean paste",
                        note: "亚洲超市常见替代"
                    }
                ]
            }
        ]
    },
    {
        id: "r_potato_beef",
        title: "土豆烧牛肉",
        cuisine: "Chinese Home",
        servings: 2,
        cookMinutes: 35,
        ingredients: [
            { ingredientKey: "beef_slice", nameZh: "牛肉片", nameEn: "sliced beef", quantity: 300, unit: "g" },
            { ingredientKey: "potato", nameZh: "土豆", nameEn: "potato", quantity: 2, unit: "piece" },
            { ingredientKey: "soy_sauce", nameZh: "生抽", nameEn: "light soy sauce", quantity: 1, unit: "tbsp" },
            { ingredientKey: "ginger", nameZh: "姜", nameEn: "ginger", quantity: 10, unit: "g" }
        ],
        steps: [
            "牛肉焯水备用。",
            "土豆煎至微黄。",
            "加入调味和水焖煮至软烂。"
        ],
        tags: ["comfort", "batch-cook"],
        substitutions: []
    },
    {
        id: "r_bokchoy_garlic",
        title: "蒜蓉上海青",
        cuisine: "Chinese Home",
        servings: 2,
        cookMinutes: 10,
        ingredients: [
            { ingredientKey: "bok_choy", nameZh: "上海青", nameEn: "bok choy", quantity: 300, unit: "g" },
            { ingredientKey: "garlic", nameZh: "大蒜", nameEn: "garlic", quantity: 3, unit: "piece" },
            { ingredientKey: "soy_sauce", nameZh: "生抽", nameEn: "light soy sauce", quantity: 1, unit: "tbsp", optional: true }
        ],
        steps: [
            "上海青洗净。",
            "热锅爆香蒜末。",
            "下上海青快速翻炒调味。"
        ],
        tags: ["quick", "veggie", "no-spicy"],
        substitutions: []
    },
    {
        id: "r_fried_rice",
        title: "蛋炒饭",
        cuisine: "Chinese Home",
        servings: 1,
        cookMinutes: 15,
        ingredients: [
            { ingredientKey: "rice", nameZh: "大米", nameEn: "rice", quantity: 250, unit: "g" },
            { ingredientKey: "egg", nameZh: "鸡蛋", nameEn: "egg", quantity: 2, unit: "piece" },
            { ingredientKey: "scallion", nameZh: "青葱", nameEn: "scallion", quantity: 1, unit: "piece", optional: true },
            { ingredientKey: "soy_sauce", nameZh: "生抽", nameEn: "light soy sauce", quantity: 1, unit: "tbsp", optional: true }
        ],
        steps: [
            "隔夜饭打散。",
            "先炒蛋，再下米饭翻炒。",
            "调味后加葱花出锅。"
        ],
        tags: ["quick", "budget", "leftover"],
        substitutions: []
    },
    {
        id: "r_noodle_soup",
        title: "清汤面",
        cuisine: "Chinese Home",
        servings: 1,
        cookMinutes: 12,
        ingredients: [
            { ingredientKey: "noodles", nameZh: "面条", nameEn: "noodles", quantity: 120, unit: "g" },
            { ingredientKey: "egg", nameZh: "鸡蛋", nameEn: "egg", quantity: 1, unit: "piece", optional: true },
            { ingredientKey: "bok_choy", nameZh: "上海青", nameEn: "bok choy", quantity: 100, unit: "g", optional: true },
            { ingredientKey: "sesame_oil", nameZh: "香油", nameEn: "sesame oil", quantity: 1, unit: "tsp", optional: true }
        ],
        steps: [
            "面条煮熟捞出。",
            "加清汤和蔬菜煮开。",
            "按口味加蛋和香油。"
        ],
        tags: ["quick", "comfort", "no-spicy"],
        substitutions: []
    },
    {
        id: "r_cabbage_stir",
        title: "手撕包菜",
        cuisine: "Sichuan",
        servings: 2,
        cookMinutes: 14,
        ingredients: [
            { ingredientKey: "cabbage", nameZh: "卷心菜", nameEn: "cabbage", quantity: 400, unit: "g" },
            { ingredientKey: "garlic", nameZh: "大蒜", nameEn: "garlic", quantity: 2, unit: "piece" },
            { ingredientKey: "chili", nameZh: "辣椒", nameEn: "chili", quantity: 2, unit: "piece", optional: true },
            { ingredientKey: "soy_sauce", nameZh: "生抽", nameEn: "light soy sauce", quantity: 1, unit: "tbsp" }
        ],
        steps: [
            "包菜手撕成片。",
            "蒜和辣椒爆香。",
            "下包菜大火快炒调味。"
        ],
        tags: ["quick", "veggie", "spicy"],
        substitutions: []
    }
];
