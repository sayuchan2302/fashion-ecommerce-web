import { useState } from 'react';
import './Categories.css';

const mensCategories = [
  { id: 'm1', name: "ÁO NAM", img: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=400&auto=format&fit=crop" },
  { id: 'm2', name: "QUẦN NAM", img: "https://images.unsplash.com/photo-1542272454315-4c01d7abdf4a?q=80&w=400&auto=format&fit=crop" },
  { id: 'm3', name: "ĐỒ THỂ THAO NAM", img: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=400&auto=format&fit=crop" },
  { id: 'm4', name: "ĐỒ MẶC NHÀ", img: "https://images.unsplash.com/photo-1618354691438-25af0475c28f?q=80&w=400&auto=format&fit=crop" },
  { id: 'm5', name: "PHỤ KIỆN NAM", img: "https://images.unsplash.com/photo-1523206489230-c012c64b2b48?q=80&w=400&auto=format&fit=crop" },
];

const womensCategories = [
  { id: 'w1', name: "ÁO NỮ", img: "https://images.unsplash.com/photo-1551163943-3f6a855d1153?q=80&w=400&auto=format&fit=crop" },
  { id: 'w2', name: "VÁY / ĐẦM", img: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=400&auto=format&fit=crop" },
  { id: 'w3', name: "QUẦN NỮ", img: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=400&auto=format&fit=crop" },
  { id: 'w4', name: "ĐỒ MẶC NHÀ", img: "https://images.unsplash.com/photo-1583496920310-91890e2b96e5?q=80&w=400&auto=format&fit=crop" },
  { id: 'w5', name: "ĐỒ THỂ THAO NỮ", img: "https://images.unsplash.com/photo-1580436427382-706f9d45cc4e?q=80&w=400&auto=format&fit=crop" },
  { id: 'w6', name: "PHỤ KIỆN NỮ", img: "https://images.unsplash.com/photo-1509319117193-57bab727e09d?q=80&w=400&auto=format&fit=crop" },
];

const Categories = () => {
  const [activeTab, setActiveTab] = useState<'nam' | 'nu'>('nam');
  const currentData = activeTab === 'nam' ? mensCategories : womensCategories;

  return (
    <section className="categories-section container">
      <div className="tab-buttons">
        <button 
          className={`tab-btn ${activeTab === 'nam' ? 'active' : ''}`}
          onClick={() => setActiveTab('nam')}
        >
          NAM
        </button>
        <button 
          className={`tab-btn ${activeTab === 'nu' ? 'active' : ''}`}
          onClick={() => setActiveTab('nu')}
        >
          NỮ
        </button>
      </div>
      
      <div className="categories-grid" key={activeTab}>
        {currentData.map((cat) => (
          <a href="#" key={cat.id} className="category-card">
            <div className="category-img-wrapper">
              <img src={cat.img} alt={cat.name} className="category-img" />
            </div>
            <span className="category-name">{cat.name}</span>
          </a>
        ))}
      </div>
    </section>
  );
};

export default Categories;
