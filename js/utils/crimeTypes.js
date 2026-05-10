/**
 * 2026年经济犯罪分类（77种）
 * 三级结构：大类 → 小类 → 罪名（含刑法条文）
 */
const CRIME_CATEGORIES = [
    {
        name: '妨害公司、企业管理秩序罪',
        subs: [
            {
                name: '资本注册类',
                crimes: [
                    { name: '虚报注册资本案', article: '第158条' },
                    { name: '虚假出资、抽逃出资案', article: '第159条' }
                ]
            },
            {
                name: '证券发行与信息类',
                crimes: [
                    { name: '欺诈发行股票、债券案', article: '第160条' },
                    { name: '违规披露、不披露重要信息案', article: '第161条' }
                ]
            },
            {
                name: '清算与破产类',
                crimes: [
                    { name: '妨害清算案', article: '第162条' },
                    { name: '隐匿、故意销毁会计凭证、会计账簿、财务会计报告案', article: '第162条之一' },
                    { name: '虚假破产案', article: '第162条之二' }
                ]
            },
            {
                name: '商业贿赂类',
                crimes: [
                    { name: '非国家工作人员受贿案', article: '第163条' },
                    { name: '对非国家工作人员行贿案', article: '第164条第1款' },
                    { name: '对外国公职人员、国际公共组织官员行贿案', article: '第164条第2款' }
                ]
            },
            {
                name: '职务侵占与挪用类',
                crimes: [
                    { name: '职务侵占案', article: '第271条第1款' },
                    { name: '挪用资金案', article: '第272条第1款' }
                ]
            }
        ]
    },
    {
        name: '破坏金融管理秩序罪',
        subs: [
            {
                name: '货币犯罪类',
                crimes: [
                    { name: '走私假币案', article: '第151条第1款' },
                    { name: '伪造货币案', article: '第170条' },
                    { name: '出售、购买、运输假币案', article: '第171条第1款' },
                    { name: '金融工作人员购买假币、以假币换取货币案', article: '第171条第2款' },
                    { name: '持有、使用假币案', article: '第172条' },
                    { name: '变造货币案', article: '第173条' }
                ]
            },
            {
                name: '金融机构设立与许可类',
                crimes: [
                    { name: '擅自设立金融机构案', article: '第174条第1款' },
                    { name: '伪造、变造、转让金融机构经营许可证、批准文件案', article: '第174条第2款' }
                ]
            },
            {
                name: '信贷与资金融通类',
                crimes: [
                    { name: '高利转贷案', article: '第175条' },
                    { name: '骗取贷款、票据承兑、金融票证案', article: '第175条之一' },
                    { name: '非法吸收公众存款案', article: '第176条' }
                ]
            },
            {
                name: '金融票证类',
                crimes: [
                    { name: '伪造、变造金融票证案', article: '第177条' },
                    { name: '妨害信用卡管理案', article: '第177条之一第1款' },
                    { name: '窃取、收买、非法提供信用卡信息案', article: '第177条之一第2款' }
                ]
            },
            {
                name: '证券期货发行与交易类',
                crimes: [
                    { name: '伪造、变造国家有价证券案', article: '第178条第1款' },
                    { name: '伪造、变造股票、公司、企业债券案', article: '第178条第2款' },
                    { name: '擅自发行股票、公司、企业债券案', article: '第179条' },
                    { name: '内幕交易、泄露内幕信息案', article: '第180条' },
                    { name: '利用未公开信息交易案', article: '第180条之一' },
                    { name: '编造并传播证券、期货交易虚假信息案', article: '第181条第1款' },
                    { name: '诱骗投资者买卖证券、期货合约案', article: '第181条第2款' },
                    { name: '操纵证券、期货市场案', article: '第182条' }
                ]
            },
            {
                name: '金融机构业务违规类',
                crimes: [
                    { name: '背信运用受托财产案', article: '第185条之一第1款' },
                    { name: '违法运用资金案', article: '第185条之一第2款' },
                    { name: '违法发放贷款案', article: '第186条' },
                    { name: '吸收客户资金不入账案', article: '第187条' },
                    { name: '违规出具金融票证案', article: '第188条' },
                    { name: '对违法票据承兑、付款、保证案', article: '第189条' }
                ]
            },
            {
                name: '外汇与洗钱类',
                crimes: [
                    { name: '骗购外汇案', article: '《外汇决定》第1条' },
                    { name: '逃汇案', article: '第190条' },
                    { name: '洗钱案', article: '第191条' }
                ]
            }
        ]
    },
    {
        name: '金融诈骗罪',
        subs: [
            {
                name: '非法集资类',
                crimes: [
                    { name: '集资诈骗案', article: '第192条' }
                ]
            },
            {
                name: '信贷诈骗类',
                crimes: [
                    { name: '贷款诈骗案', article: '第193条' }
                ]
            },
            {
                name: '票据与结算凭证诈骗类',
                crimes: [
                    { name: '票据诈骗案', article: '第194条第1款' },
                    { name: '金融凭证诈骗案', article: '第194条第2款' }
                ]
            },
            {
                name: '信用证诈骗类',
                crimes: [
                    { name: '信用证诈骗案', article: '第195条' }
                ]
            },
            {
                name: '信用卡诈骗类',
                crimes: [
                    { name: '信用卡诈骗案', article: '第196条' }
                ]
            },
            {
                name: '有价证券诈骗类',
                crimes: [
                    { name: '有价证券诈骗案', article: '第197条' }
                ]
            },
            {
                name: '保险诈骗类',
                crimes: [
                    { name: '保险诈骗案', article: '第198条' }
                ]
            }
        ]
    },
    {
        name: '危害税收征管罪',
        subs: [
            {
                name: '逃税与抗税类',
                crimes: [
                    { name: '逃税案', article: '第201条' },
                    { name: '抗税案', article: '第202条' },
                    { name: '逃避追缴欠税案', article: '第203条' }
                ]
            },
            {
                name: '出口退税类',
                crimes: [
                    { name: '骗取出口退税案', article: '第204条第1款' }
                ]
            },
            {
                name: '增值税专用发票类',
                crimes: [
                    { name: '虚开增值税专用发票、用于骗取出口退税、抵扣税款发票案', article: '第205条' },
                    { name: '伪造、出售伪造的增值税专用发票案', article: '第206条' },
                    { name: '非法出售增值税专用发票案', article: '第207条' },
                    { name: '非法购买增值税专用发票、购买伪造的增值税专用发票案', article: '第208条第1款' }
                ]
            },
            {
                name: '普通发票类',
                crimes: [
                    { name: '非法制造、出售非法制造的用于骗取出口退税、抵扣税款发票案', article: '第209条第1款' },
                    { name: '非法制造、出售非法制造的发票案', article: '第209条第2款' },
                    { name: '非法出售用于骗取出口退税、抵扣税款发票案', article: '第209条第3款' },
                    { name: '非法出售发票案', article: '第209条第4款' }
                ]
            }
        ]
    },
    {
        name: '扰乱市场秩序罪',
        subs: [
            {
                name: '合同诈骗类',
                crimes: [
                    { name: '合同诈骗案', article: '第224条' }
                ]
            },
            {
                name: '非法经营类',
                crimes: [
                    { name: '非法经营案', article: '第225条' }
                ]
            },
            {
                name: '强迫交易类',
                crimes: [
                    { name: '强迫交易案', article: '第226条' }
                ]
            },
            {
                name: '商业信誉与商品声誉类',
                crimes: [
                    { name: '损害商业信誉、商品声誉案', article: '第221条' }
                ]
            },
            {
                name: '串通投标类',
                crimes: [
                    { name: '串通投标案', article: '第223条' }
                ]
            },
            {
                name: '传销类',
                crimes: [
                    { name: '组织、领导传销活动案', article: '第224条之一' }
                ]
            },
            {
                name: '中介组织人员犯罪类',
                crimes: [
                    { name: '提供虚假证明文件案', article: '第229条第1款、第2款' },
                    { name: '出具证明文件重大失实案', article: '第229条第3款' }
                ]
            },
            {
                name: '虚假广告类',
                crimes: [
                    { name: '虚假广告案', article: '第222条' }
                ]
            }
        ]
    },
    {
        name: '侵犯财产罪',
        subs: [
            {
                name: '挪用类',
                crimes: [
                    { name: '挪用特定款物案', article: '第273条' }
                ]
            },
            {
                name: '拒不支付劳动报酬类',
                crimes: [
                    { name: '拒不支付劳动报酬案', article: '第276条之一' }
                ]
            }
        ]
    },
    {
        name: '妨害社会管理秩序罪',
        subs: [
            {
                name: '虚假诉讼类',
                crimes: [
                    { name: '虚假诉讼案', article: '第307条之一' }
                ]
            }
        ]
    },
    {
        name: '危害公共安全罪',
        subs: [
            {
                name: '资助恐怖活动类',
                crimes: [
                    { name: '帮助恐怖活动案', article: '第120条之一第1款（仅限资助行为）' }
                ]
            }
        ]
    }
];

/**
 * 获取所有罪名的扁平列表
 */
function getAllCrimes() {
    const list = [];
    CRIME_CATEGORIES.forEach(cat => {
        cat.subs.forEach(sub => {
            sub.crimes.forEach(crime => {
                list.push({
                    category: cat.name,
                    subCategory: sub.name,
                    name: crime.name,
                    article: crime.article,
                    fullName: `${crime.name}（${crime.article}）`
                });
            });
        });
    });
    return list;
}

/**
 * 获取收藏的常用案件类型
 */
function getFavoriteCrimes() {
    return LS.get('favoriteCrimes', []);
}

function toggleFavoriteCrime(crimeName) {
    const favs = getFavoriteCrimes();
    const idx = favs.indexOf(crimeName);
    if (idx >= 0) {
        favs.splice(idx, 1);
    } else {
        favs.push(crimeName);
    }
    LS.set('favoriteCrimes', favs);
    return favs;
}

function isFavoriteCrime(crimeName) {
    return getFavoriteCrimes().includes(crimeName);
}
