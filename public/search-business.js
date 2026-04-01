/**
 * search-business.js - 搜索业务模块
 * 城市搜索、筛选、对接功能
 */

let cityData = [];

// 加载城市数据
async function loadCityData() {
  try {
    const response = await fetch('./data/city-data.json?t=' + Date.now());
    cityData = await response.json();
    console.log('cityData loaded:', cityData.length);
    return cityData;
  } catch (e) {
    console.error('Failed to load cityData:', e);
    return [];
  }
}

// 搜索资源
function searchResources(keyword) {
  if (!keyword) return cityData;
  
  return cityData.filter(item => 
    item.name?.includes(keyword) ||
    item.province?.includes(keyword) ||
    item.type?.includes(keyword)
  );
}

// 筛选资源类型
function filterByType(type) {
  if (!type || type === 'all') return cityData;
  return cityData.filter(item => item.type === type);
}

// 获取热门资源
function getHotResources(limit = 10) {
  return cityData
    .filter(item => item.hot)
    .slice(0, limit);
}

export { loadCityData, searchResources, filterByType, getHotResources };
