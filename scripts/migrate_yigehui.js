/**
 * yigehui数据库 → 资源夜市数据库 迁移脚本
 * 源数据: cmf_fabuxinxi (发布信息)
 * 目标: renmaiquan.resources 表
 * 
 * 使用方法: node scripts/migrate_yigehui.js
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// 从SQL文件中提取并解析cmf_fabuxinxi数据
function parseFabuxinxiFromSQL(sqlFile) {
    const data = fs.readFileSync(sqlFile, 'utf8');
    
    // 提取CREATE TABLE
    const createMatch = data.match(/CREATE TABLE `cmf_fabuxinxi`(.*?)ENGINE/s);
    if (!createMatch) {
        console.error('未找到cmf_fabuxinxi表结构');
        return null;
    }
    console.log('找到表结构:', createMatch[0].substring(0, 200));
    
    // 提取INSERT数据
    const insertMatch = data.match(/INSERT INTO `cmf_fabuxinxi` VALUES\s*(.*?);/s);
    if (!insertMatch) {
        console.error('未找到cmf_fabuxinxi数据');
        return [];
    }
    
    const insertData = insertMatch[1];
    // 解析每条记录
    const records = [];
    const tupleRegex = /\(\s*(\d+)\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*(\d+)\s*,\s*([\d.]+)\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,(.*?)\)/sg;
    
    let match;
    while ((match = tupleRegex.exec(insertData)) !== null) {
        records.push({
            id: parseInt(match[1]),
            danwei: match[2],
            jiancheng: match[3],
            hangye: match[4],
            bumen: match[5],
            jibie: match[6],
            guanxichengdu: match[7],
            ischenggong: parseInt(match[8]),
            huibao: parseFloat(match[9]),
            hbguanliyuan: match[10],
            time: match[11],
            neirong: match[12],
            status: parseInt(match[13]),
            type: parseInt(match[14]),
            user_id: parseInt(match[15]),
            diqu: match[16] ? match[16].replace(/^NULL$/, '') : '',
            hangye2: match[17] ? match[17].replace(/^NULL$/, '') : '',
            fb_time: match[18] ? match[18].replace(/^NULL$/, '') : '',
            is_new: match[19] ? parseInt(match[19]) : 0,
            xingzhi: match[20] ? match[20].replace(/^NULL$/, '') : '',
            extra: match[21] || ''
        });
    }
    
    return records;
}

// 转换为我们数据库的格式
function transformRecord(record) {
    // 判断是供给还是需求 (status: 0=发布/供给, 1=需求)
    const type = record.type === 0 ? 'supply' : 'demand';
    
    // 关系程度映射
    const relationMap = {
        '合作过，随时约': 'cooperation',
        '通过朋友约': 'friend_referral', 
        '间接关系': 'indirect'
    };
    
    return {
        title: record.danwei || record.jiancheng || '未命名',
        company: record.danwei,
        industry: record.hangye || record.hangye2 || '',
        department: record.bumen || '',
        position: record.jibie || '',
        region: record.diqu || '',
        description: record.neirong || '',
        relation_type: relationMap[record.guanxichengdu] || 'indirect',
        reward: record.huibao ? String(record.huibao) : '',
        contact_person: record.hbguanliyuan || '',
        phone: record.time || '',
        type: type,
        status: 'active',
        source: 'yigehui',
        source_id: record.id,
        created_at: record.fb_time ? new Date(parseInt(record.fb_time) * 1000) : new Date(),
        user_id: record.user_id || 1
    };
}

async function migrate() {
    const sqlFile = '/tmp/yigehui.sql';
    const records = parseFabuxinxiFromSQL(sqlFile);
    
    if (!records || records.length === 0) {
        console.error('没有找到数据');
        return;
    }
    
    console.log(`\n找到 ${records.length} 条记录\n`);
    
    // 打印前3条看看
    records.slice(0, 3).forEach((r, i) => {
        console.log(`记录${i+1}:`, JSON.stringify({
            danwei: r.danwei,
            hangye: r.hangye,
            bumen: r.bumen,
            guanxichengdu: r.guanxichengdu,
            huibao: r.huibao,
            neirong: r.neirong.substring(0, 50)
        }));
    });
    
    // 转换为目标格式
    const transformed = records.map(transformRecord);
    
    console.log(`\n转换完成，准备写入数据库...`);
    console.log('样本数据:');
    console.log(JSON.stringify(transformed[0], null, 2));
    
    // 连接目标数据库
    const targetDb = mysql.createPool({
        host: 'localhost',
        user: 'renmai_user',
        password: 'Renmai@2026db',
        database: 'renmaiquan',
        waitForConnections: true,
        connectionLimit: 5
    });
    
    try {
        // 检查resources表是否存在
        const [tables] = await targetDb.query('SHOW TABLES LIKE "resources"');
        if (tables.length === 0) {
            console.log('resources表不存在，需要创建');
            await targetDb.query(`
                CREATE TABLE IF NOT EXISTS resources (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    title VARCHAR(255),
                    company VARCHAR(255),
                    industry VARCHAR(100),
                    department VARCHAR(100),
                    position VARCHAR(100),
                    region VARCHAR(100),
                    description TEXT,
                    relation_type VARCHAR(50),
                    reward VARCHAR(100),
                    contact_person VARCHAR(100),
                    phone VARCHAR(50),
                    type ENUM('supply','demand') DEFAULT 'supply',
                    status VARCHAR(20) DEFAULT 'active',
                    source VARCHAR(50),
                    source_id INT,
                    user_id INT DEFAULT 1,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_source (source),
                    INDEX idx_industry (industry),
                    INDEX idx_region (region)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
            `);
            console.log('resources表创建成功');
        }
        
        // 插入数据
        let inserted = 0;
        for (const record of transformed) {
            try {
                await targetDb.query(
                    `INSERT INTO resources 
                    (title, company, industry, department, position, region, description, relation_type, reward, contact_person, phone, type, status, source, source_id, user_id, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        record.title, record.company, record.industry, record.department,
                        record.position, record.region, record.description, record.relation_type,
                        record.reward, record.contact_person, record.phone, record.type,
                        record.status, record.source, record.source_id, record.user_id, record.created_at
                    ]
                );
                inserted++;
                console.log(`  ✅ 导入: ${record.title}`);
            } catch (err) {
                console.error(`  ❌ 导入失败: ${record.title} - ${err.message}`);
            }
        }
        
        console.log(`\n导入完成: ${inserted}/${transformed.length} 条`);
        
    } finally {
        await targetDb.end();
    }
}

migrate().catch(console.error);
