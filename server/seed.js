const { sequelize, User, Group, EnterpriseLike, Project, HelpRequest, GovernmentResource } = require('./models');
const bcrypt = require('bcryptjs');

const cities = ['北京', '上海', '深圳', '广州', '杭州', '成都', '武汉', '南京', '西安', '苏州', '重庆', '天津'];
const industries = ['互联网', '金融', '医疗', '教育', '房地产', '制造业', '电商', '餐饮', '旅游', '物流', '服装', '媒体', '建筑', '能源', '农业'];
const businessTypes = ['软件开发', '产品设计', '市场营销', '投资融资', '咨询服务', '人才招聘', '法务财务', '媒体公关', '教育培训', '医疗健康'];
const companyPrefix = ['华', '中', '国', '大', '新', '恒', '祥', '盛', '泰', '瑞'];
const companySuffix = ['科技', '实业', '集团', '控股', '投资', '咨询', '服务', '贸易', '传媒', '健康'];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysAgo = 30) {
  const now = Date.now();
  const past = now - daysAgo * 24 * 60 * 60 * 1000;
  return new Date(past + Math.random() * (now - past));
}

function generateCompanyName() {
  return randomItem(companyPrefix) + randomItem(companySuffix) + randomItem(industries) + '有限公司';
}

function generateProjectTitle() {
  const types = ['创业项目', '合作项目', '投资项目', '外包项目', '合伙创业', '天使轮融资', 'A轮融资', 'B轮融资'];
  return randomItem(cities) + randomItem(industries) + randomItem(types);
}

async function seed() {
  try {
    console.log('🚀 开始生成虚拟数据...\n');

    // 创建测试用户 (20个)
    console.log('📦 创建用户...');
    const password = await bcrypt.hash('123456', 10);
    const userIds = [];
    for (let i = 1; i <= 20; i++) {
      try {
        const user = await User.create({
          username: `用户${i}`,
          password,
          member_level: i % 4,
          total_income: (Math.random() * 10000).toFixed(2),
          is_admin: i === 1
        });
        userIds.push(user.id);
      } catch (e) {
        userIds.push(1);
      }
    }
    console.log(`✅ 创建用户完成: ${userIds.length}个\n`);

    // 生成群码 100 条
    console.log('📱 生成群码...');
    for (let i = 0; i < 100; i++) {
      const status = Math.random() > 0.15 ? 1 : 0;
      const memberCount = randomInt(50, 500);
      await Group.create({
        user_id: randomItem(userIds),
        name: `${randomItem(cities)}${randomItem(industries)}交流群`,
        qrcode: `qr_group_${Date.now()}_${i}`,
        owner_qrcode: `owner_qr_${i}`,
        industry_id: randomInt(1, industries.length),
        region: randomItem(cities),
        member_count: memberCount,
        expire_time: new Date(Date.now() + (status === 1 ? 365 : -10) * 24 * 60 * 60 * 1000),
        status,
        created_at: randomDate(60)
      });
    }
    console.log('✅ 群码生成完成: 100条\n');

    // 生成企业资源 100 条
    console.log('🏢 生成企业资源...');
    for (let i = 0; i < 100; i++) {
      const status = Math.random() > 0.15 ? 1 : 0;
      await EnterpriseLike.create({
        user_id: randomItem(userIds),
        company_name: generateCompanyName(),
        department: randomItem(['市场部', '技术部', '人事部', '财务部', '销售部', '总裁办']),
        region: randomItem(cities),
        industry: randomItem(industries),
        expire_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
        contact_qrcode: `contact_${i}`,
        status,
        created_at: randomDate(60)
      });
    }
    console.log('✅ 企业资源生成完成: 100条\n');

    // 生成项目 100 条
    console.log('📊 生成项目...');
    for (let i = 0; i < 100; i++) {
      const status = Math.random() > 0.15 ? 1 : 0;
      const amount = (Math.random() * 990 + 10).toFixed(2);
      await Project.create({
        user_id: randomItem(userIds),
        title: generateProjectTitle(),
        description: `优质${randomItem(industries)}项目，寻求合作伙伴。项目团队专业，已有初步成果，期待与有资源的投资人或机构合作。`,
        amount,
        requirement: `需要${randomItem(['技术开发', '市场营销', '投资融资', '人才支持', '渠道对接', '供应链支持'])}资源`,
        progress: randomItem(['概念阶段', 'MVP开发中', '已上线运营', '寻求融资', '扩张阶段']),
        industry_id: randomInt(1, industries.length),
        region: randomItem(cities),
        expire_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        status,
        created_at: randomDate(60)
      });
    }
    console.log('✅ 项目生成完成: 100条\n');

    // 生成求助 100 条
    console.log('🆘 生成求助...');
    for (let i = 0; i < 100; i++) {
      const status = Math.random() > 0.15 ? 1 : 0;
      const reward = (Math.random() * 9 + 1).toFixed(2);
      await HelpRequest.create({
        user_id: randomItem(userIds),
        description: `急需${randomItem(['融资', '技术人才', '市场渠道', '合作伙伴', '办公场地', '法律咨询'])}，有意者请联系，非诚勿扰`,
        target_company: generateCompanyName(),
        region: randomItem(cities),
        business_type: randomItem(businessTypes),
        reward_amount: reward,
        expire_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        contact_info: `微信: renmai_${i}`,
        status,
        created_at: randomDate(60)
      });
    }
    console.log('✅ 求助生成完成: 100条\n');

    // 生成政务资源 50 条
    console.log('🏛️ 生成政务资源...');
    for (let i = 0; i < 50; i++) {
      const status = Math.random() > 0.2 ? 1 : 0;
      await GovernmentResource.create({
        user_id: randomItem(userIds),
        business_type: randomItem(businessTypes),
        province: randomItem(cities),
        city: randomItem(cities),
        district: `${randomItem(cities)}区`,
        level_code: randomItem(['国家级', '省级', '市级', '区级', '镇街级']),
        familiarity: randomItem(['非常熟悉', '比较熟悉', '一般了解', '初步接触']),
        has_case: Math.random() > 0.4,
        expire_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        contact_qrcode: `gov_${i}`,
        status,
        created_at: randomDate(60)
      });
    }
    console.log('✅ 政务资源生成完成: 50条\n');

    // 统计
    const groupCount = await Group.count();
    const enterpriseCount = await EnterpriseLike.count();
    const projectCount = await Project.count();
    const helpCount = await HelpRequest.count();
    const govCount = await GovernmentResource.count();

    console.log('═══════════════════════════════════════');
    console.log('🎉 虚拟数据生成完成！');
    console.log('═══════════════════════════════════════');
    console.log(`📊 数据统计:`);
    console.log(`   • 用户: 20个 (密码: 123456)`);
    console.log(`   • 群码: ${groupCount}条`);
    console.log(`   • 企业资源: ${enterpriseCount}条`);
    console.log(`   • 项目: ${projectCount}条`);
    console.log(`   • 求助: ${helpCount}条`);
    console.log(`   • 政务资源: ${govCount}条`);
    console.log(`   • 总计: ${groupCount + enterpriseCount + projectCount + helpCount + govCount}条`);
    console.log('═══════════════════════════════════════');

    process.exit(0);
  } catch (err) {
    console.error('❌ 生成失败:', err);
    process.exit(1);
  }
}

seed();
