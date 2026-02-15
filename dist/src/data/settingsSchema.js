export const SETTINGS_SCHEMA = {
    sections: [
        {
            key: "language_region",
            labels: {
                zh: "语言与地区",
                en: "Language & Region"
            }
        },
        {
            key: "cooking_preferences",
            labels: {
                zh: "做菜偏好",
                en: "Cooking Preferences"
            }
        },
        {
            key: "notifications",
            labels: {
                zh: "提醒与通知",
                en: "Alerts & Notifications"
            }
        },
        {
            key: "more_personalization",
            labels: {
                zh: "更多个性化",
                en: "More Personalization"
            }
        }
    ],
    fields: [
        {
            key: "defaultServings",
            type: "number",
            section: "cooking_preferences",
            labels: {
                zh: "默认人数",
                en: "Default Servings"
            },
            default: 2,
            validations: {
                min: 1,
                max: 6
            }
        },
        {
            key: "spiceLevel",
            type: "single_select",
            section: "cooking_preferences",
            labels: {
                zh: "辣度偏好",
                en: "Spice Preference"
            },
            default: "medium",
            options: [
                {
                    value: "mild",
                    labels: {
                        zh: "不辣",
                        en: "Mild"
                    }
                },
                {
                    value: "medium",
                    labels: {
                        zh: "微辣",
                        en: "Medium"
                    }
                },
                {
                    value: "hot",
                    labels: {
                        zh: "偏辣",
                        en: "Hot"
                    }
                }
            ]
        },
        {
            key: "avoidIngredients",
            type: "multi_select",
            section: "cooking_preferences",
            labels: {
                zh: "忌口",
                en: "Avoid Ingredients"
            },
            default: [],
            options: [
                {
                    value: "beef",
                    labels: {
                        zh: "牛肉",
                        en: "Beef"
                    }
                },
                {
                    value: "pork",
                    labels: {
                        zh: "猪肉",
                        en: "Pork"
                    }
                },
                {
                    value: "shellfish",
                    labels: {
                        zh: "贝壳类",
                        en: "Shellfish"
                    }
                },
                {
                    value: "cilantro",
                    labels: {
                        zh: "香菜",
                        en: "Cilantro"
                    }
                }
            ]
        },
        {
            key: "expiryNotificationsEnabled",
            type: "boolean",
            section: "notifications",
            labels: {
                zh: "临期提醒",
                en: "Expiry Reminder"
            },
            default: true
        },
        {
            key: "expiryLeadDays",
            type: "number",
            section: "notifications",
            labels: {
                zh: "提前提醒天数",
                en: "Reminder Lead Days"
            },
            default: 2,
            validations: {
                min: 0,
                max: 5
            },
            visibleWhen: {
                key: "expiryNotificationsEnabled",
                equals: true
            }
        },
        {
            key: "reminderTime",
            type: "time",
            section: "notifications",
            labels: {
                zh: "提醒时段",
                en: "Reminder Time"
            },
            default: "18:00",
            visibleWhen: {
                key: "expiryNotificationsEnabled",
                equals: true
            }
        },
        {
            key: "kitchenNickname",
            type: "text",
            section: "more_personalization",
            labels: {
                zh: "厨房昵称",
                en: "Kitchen Nickname"
            },
            default: "",
            validations: {
                maxLength: 24
            }
        }
    ]
};
export function buildDefaultSettingsValues() {
    const defaults = {};
    for (const field of SETTINGS_SCHEMA.fields) {
        defaults[field.key] = field.default;
    }
    return defaults;
}
