'use client';

/**
 * Profile View - Proper React Implementation
 * This is the clean version that will eventually replace the iframe hack
 */

import { useEffect, useRef, useState } from 'react';
import type { CustomerProfile } from '@/lib/types';
import Script from 'next/script';
import EditorialHero from './components/EditorialHero';
import ProfileOverview from './components/ProfileOverview';
import PillarCards from './components/PillarCards';
import StylePatterns from './components/StylePatterns';
import CrossLinks from './components/CrossLinks';

interface ProfileViewProps {
  profile: CustomerProfile;
}

export default function ProfileView({ profile }: ProfileViewProps) {
  const radarChartRef = useRef<HTMLDivElement>(null);
  const [lifestyleImages, setLifestyleImages] = useState<any[]>([]);
  const firstName = profile?.customer_name?.split(' ')[0] || 'Customer';

  const topPillars = profile?.pillars
    ? Object.entries(profile.pillars)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 5)
    : [];

  const top3Pillars = topPillars.slice(0, 3);

  // Debug log
  useEffect(() => {
    console.log('✅ ProfileView mounted');
    console.log('  - Customer:', profile?.customer_name);
    console.log('  - Top pillars:', topPillars.map(([name, weight]) => `${name}: ${weight}%`));
    console.log('  - Lifestyle images loaded:', lifestyleImages.length);
  }, [profile, lifestyleImages]);

  // Load lifestyle images
  useEffect(() => {
    async function loadLifestyleImages() {
      try {
        const response = await fetch('/api/lifestyle-images');
        if (response.ok) {
          const data = await response.json();
          if (data.results && data.results.length > 0) {
            setLifestyleImages(data.results);
          }
        }
      } catch (error) {
        console.error('Error loading lifestyle images:', error);
      }
    }

    loadLifestyleImages();
  }, []);

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .profile-section-animated {
          animation: fadeInUp 0.6s ease-out forwards;
          opacity: 0;
        }

        .profile-section-animated:nth-child(1) { animation-delay: 0.1s; }
        .profile-section-animated:nth-child(2) { animation-delay: 0.2s; }
        .profile-section-animated:nth-child(3) { animation-delay: 0.3s; }
        .profile-section-animated:nth-child(4) { animation-delay: 0.4s; }
        .profile-section-animated:nth-child(5) { animation-delay: 0.5s; }
      `}</style>

      <main className="customer-view">
        {/* Top Banner */}
        <div className="top-banner">
          Free shipping on orders $89+. <a href="#">See Details</a>
        </div>

      {/* Site Header */}
      <header className="site-header">
        <a href="#" className="site-logo">NORDSTROM</a>

        <div className="site-search">
          <input type="text" className="site-search-input" placeholder="Search for products and brands" />
          <svg className="site-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </div>

        <div className="site-actions">
          <a href="#" className="site-action">
            <svg className="site-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span className="site-action-text">{firstName}</span>
          </a>

          <a href="#" className="site-action">
            <svg className="site-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span className="site-action-text">Stores</span>
          </a>

          <a href="#" className="site-action">
            <svg className="site-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <path d="M16 10a4 4 0 0 1-8 0"></path>
            </svg>
            <span className="site-action-text">Purchases</span>
          </a>
        </div>
      </header>

      {/* Main Navigation */}
      <nav className="main-nav">
        <a href="#" className="main-nav-link sale">Sale</a>
        <a href="#" className="main-nav-link">Women</a>
        <a href="#" className="main-nav-link">Men</a>
        <a href="#" className="main-nav-link">Kids</a>
        <a href="#" className="main-nav-link">Designer</a>
        <a href="#" className="main-nav-link">Brands</a>
        <a href="#" className="main-nav-link">Young Adult</a>
        <a href="#" className="main-nav-link">Activewear</a>
        <a href="#" className="main-nav-link">Home</a>
        <a href="#" className="main-nav-link">Beauty</a>
        <a href="#" className="main-nav-link">Gifts</a>
      </nav>

      {/* Account Layout */}
      <div className="account-layout">
        {/* Account Sidebar */}
        <aside className="account-sidebar">
          <div className="account-header">
            <h2 className="account-header-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path fillRule="evenodd" clipRule="evenodd" d="M0 12C0 5.37258 5.37258 0 12 0C18.6274 0 24 5.37258 24 12C24 18.6274 18.6274 24 12 24C5.37258 24 0 18.6274 0 12ZM3.64743 17.5006C2.60612 15.9226 2 14.0321 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 14.0324 21.3937 15.9232 20.3521 17.5014C19.9802 16.9365 19.5511 16.4095 19.0706 15.9289C18.142 15.0003 17.0396 14.2638 15.8263 13.7612C15.3993 13.5843 14.9614 13.4376 14.516 13.3218C16.0017 12.455 17 10.8441 17 9C17 6.23858 14.7614 4 12 4C9.23859 4 7.00002 6.23858 7.00002 9C7.00002 10.844 7.99821 12.4548 9.48373 13.3216C9.03806 13.4375 8.59996 13.5842 8.17266 13.7612C6.9594 14.2638 5.85701 15.0003 4.92842 15.9289C4.44812 16.4092 4.01919 16.936 3.64743 17.5006ZM4.99451 19.136C6.79873 20.9075 9.27178 22 12 22C14.7279 22 17.2007 20.9077 19.0048 19.1367C18.6425 18.4797 18.1889 17.8757 17.6563 17.3431C16.9135 16.6003 16.0316 16.011 15.061 15.609C14.0904 15.2069 13.0501 15 11.9995 15C10.9489 15 9.90863 15.2069 8.93802 15.609C7.96742 16.011 7.08551 16.6003 6.34264 17.3431C5.81024 17.8755 5.35674 18.4794 4.99451 19.136ZM12 6C10.3432 6 9.00002 7.34315 9.00002 9C9.00002 10.6569 10.3432 12 12 12C13.6569 12 15 10.6569 15 9C15 7.34315 13.6569 6 12 6Z" fill="currentColor"/>
              </svg>
              <span>{firstName}'s Account</span>
            </h2>
          </div>

          {/* Account Info */}
          <a href="#" className="account-nav-item">
            <svg className="account-nav-icon" viewBox="0 0 24 24" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M0 12C0 5.37258 5.37258 0 12 0C18.6274 0 24 5.37258 24 12C24 18.6274 18.6274 24 12 24C5.37258 24 0 18.6274 0 12ZM3.64743 17.5006C2.60612 15.9226 2 14.0321 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 14.0324 21.3937 15.9232 20.3521 17.5014C19.9802 16.9365 19.5511 16.4095 19.0706 15.9289C18.142 15.0003 17.0396 14.2638 15.8263 13.7612C15.3993 13.5843 14.9614 13.4376 14.516 13.3218C16.0017 12.455 17 10.8441 17 9C17 6.23858 14.7614 4 12 4C9.23859 4 7.00002 6.23858 7.00002 9C7.00002 10.844 7.99821 12.4548 9.48373 13.3216C9.03806 13.4375 8.59996 13.5842 8.17266 13.7612C6.9594 14.2638 5.85701 15.0003 4.92842 15.9289C4.44812 16.4092 4.01919 16.936 3.64743 17.5006ZM4.99451 19.136C6.79873 20.9075 9.27178 22 12 22C14.7279 22 17.2007 20.9077 19.0048 19.1367C18.6425 18.4797 18.1889 17.8757 17.6563 17.3431C16.9135 16.6003 16.0316 16.011 15.061 15.609C14.0904 15.2069 13.0501 15 11.9995 15C10.9489 15 9.90863 15.2069 8.93802 15.609C7.96742 16.011 7.08551 16.6003 6.34264 17.3431C5.81024 17.8755 5.35674 18.4794 4.99451 19.136ZM12 6C10.3432 6 9.00002 7.34315 9.00002 9C9.00002 10.6569 10.3432 12 12 12C13.6569 12 15 10.6569 15 9C15 7.34315 13.6569 6 12 6Z" fill="currentColor"/>
            </svg>
            <span className="account-nav-title">Account Info</span>
          </a>

          {/* Purchases */}
          <a href="#" className="account-nav-item">
            <svg className="account-nav-icon" viewBox="0 0 24 24" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 0C9.79086 0 8 1.79086 8 4V6H5C3.89543 6 3 6.89543 3 8V20C3 22.2091 4.79086 24 7 24H17C19.2091 24 21 22.2091 21 20V8C21 6.89543 20.1046 6 19 6H16V4C16 1.79086 14.2091 0 12 0ZM14 8V11C14 11.5523 14.4477 12 15 12C15.5523 12 16 11.5523 16 11V8H19V20C19 21.1046 18.1046 22 17 22H7C5.89543 22 5 21.1046 5 20V8H8V11C8 11.5523 8.44772 12 9 12C9.55228 12 10 11.5523 10 11V8H14ZM14 6V4C14 2.89543 13.1046 2 12 2C10.8954 2 10 2.89543 10 4V6H14Z" fill="currentColor"/>
            </svg>
            <div className="account-nav-content">
              <span className="account-nav-title">Purchases</span>
              <span className="account-nav-subtitle">Track, manage & return</span>
            </div>
          </a>

          {/* Wish Lists */}
          <a href="#" className="account-nav-item">
            <svg className="account-nav-icon" viewBox="0 0 24 24" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M0.000244141 8.75C0.000244141 5.02208 3.02232 2 6.75024 2C8.87178 2 10.7634 2.9787 12.0002 4.5073C13.2371 2.9787 15.1287 2 17.2502 2C20.9782 2 24.0002 5.02208 24.0002 8.75C24.0002 12.7009 21.1472 16.1603 18.4721 18.5682C15.7458 21.0223 12.9324 22.6252 12.531 22.8492C12.3988 22.923 12.218 22.9884 12.0002 22.9884C11.7825 22.9884 11.6017 22.923 11.4695 22.8492C11.0681 22.6252 8.25466 21.0223 5.52836 18.5682C2.85324 16.1603 0.000244141 12.7009 0.000244141 8.75ZM6.75024 4C4.12689 4 2.00024 6.12665 2.00024 8.75C2.00024 11.7828 4.25066 14.7272 6.8664 17.0817C8.93547 18.9442 11.0698 20.2922 12.0002 20.8457C12.9307 20.2922 15.065 18.9442 17.1341 17.0817C19.7498 14.7272 22.0002 11.7828 22.0002 8.75C22.0002 6.12665 19.8736 4 17.2502 4C15.3196 4 13.6558 5.15193 12.9128 6.81019C12.7517 7.16983 12.3943 7.4013 12.0002 7.4013C11.6061 7.4013 11.2488 7.16983 11.0877 6.81019C10.3447 5.15193 8.6809 4 6.75024 4Z" fill="currentColor"/>
            </svg>
            <div className="account-nav-content">
              <span className="account-nav-title">Wish Lists</span>
              <span className="account-nav-subtitle">Create & manage lists</span>
            </div>
          </a>

          {/* Nordy Club */}
          <a href="#" className="account-nav-item">
            <svg className="account-nav-icon" viewBox="0 0 24 24" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M1.10793 11.4381C-0.104173 11.0086 -0.104174 9.29447 1.10793 8.86498L6.11561 7.09059L7.89 2.08291C8.31949 0.870801 10.0337 0.870803 10.4632 2.08291L12.2376 7.09059L17.2452 8.86498C18.4573 9.29447 18.4573 11.0086 17.2452 11.4381L12.2376 13.2125L10.4632 18.2202C10.0337 19.4323 8.31949 19.4323 7.89 18.2202L6.11561 13.2125L1.10793 11.4381ZM11.5696 11.3274C11.0011 11.5288 10.5538 11.976 10.3524 12.5446L9.17658 15.8629L8.00077 12.5446C7.79933 11.976 7.35209 11.5288 6.78359 11.3274L3.46521 10.1516L6.78359 8.97574C7.35209 8.7743 7.79933 8.32707 8.00077 7.75856L9.17658 4.44018L10.3524 7.75856C10.5538 8.32707 11.0011 8.7743 11.5696 8.97574L14.888 10.1516L11.5696 11.3274Z" fill="currentColor"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M19.9555 14.3029L20.8427 16.8068L23.3466 17.694C23.9526 17.9087 23.9526 18.7658 23.3466 18.9805L20.8427 19.8677L19.9555 22.3716C19.7408 22.9776 18.8837 22.9776 18.6689 22.3716L17.7817 19.8677L15.2779 18.9805C14.6719 18.7658 14.6719 17.9087 15.2779 17.694L17.7817 16.8068L18.6689 14.3029C18.8837 13.6969 19.7408 13.6969 19.9555 14.3029ZM20.5087 18.9252C20.2245 19.0259 20.0009 19.2495 19.9001 19.5338L19.3122 21.1929L18.7243 19.5338C18.6236 19.2495 18.4 19.0259 18.1157 18.9252L16.4565 18.3373L18.1157 17.7493C18.4 17.6486 18.6236 17.425 18.7243 17.1408L19.3122 15.4816L19.9001 17.1408C20.0009 17.425 20.2245 17.6486 20.5087 17.7493L22.1679 18.3373L20.5087 18.9252Z" fill="currentColor"/>
            </svg>
            <div className="account-nav-content">
              <span className="account-nav-title">Nordy Club Rewards</span>
              <span className="account-nav-subtitle">$9.91 to use</span>
            </div>
          </a>

          {/* Payment Methods */}
          <a href="#" className="account-nav-item">
            <svg className="account-nav-icon" viewBox="0 0 24 24" fill="none">
              <path d="M5 12C4.44772 12 4 12.4477 4 13C4 13.5523 4.44772 14 5 14H6C6.55228 14 7 13.5523 7 13C7 12.4477 6.55228 12 6 12H5Z" fill="currentColor"/>
              <path d="M8 13C8 12.4477 8.44771 12 9 12H10C10.5523 12 11 12.4477 11 13C11 13.5523 10.5523 14 10 14H9C8.44771 14 8 13.5523 8 13Z" fill="currentColor"/>
              <path d="M13 12C12.4477 12 12 12.4477 12 13C12 13.5523 12.4477 14 13 14H14C14.5523 14 15 13.5523 15 13C15 12.4477 14.5523 12 14 12H13Z" fill="currentColor"/>
              <path d="M16 13C16 12.4477 16.4477 12 17 12H18C18.5523 12 19 12.4477 19 13C19 13.5523 18.5523 14 18 14H17C16.4477 14 16 13.5523 16 13Z" fill="currentColor"/>
              <path d="M5 15C4.44772 15 4 15.4477 4 16C4 16.5523 4.44772 17 5 17H14C14.5523 17 15 16.5523 15 16C15 15.4477 14.5523 15 14 15H5Z" fill="currentColor"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M3 3C1.34315 3 0 4.34315 0 6V18C0 19.6569 1.34314 21 3 21H21C22.6569 21 24 19.6569 24 18V6C24 4.34315 22.6569 3 21 3H3ZM2 6C2 5.44772 2.44772 5 3 5H21C21.5523 5 22 5.44771 22 6V18C22 18.5523 21.5523 19 21 19H3C2.44772 19 2 18.5523 2 18V6Z" fill="currentColor"/>
            </svg>
            <div className="account-nav-content">
              <span className="account-nav-title">Payment Methods</span>
              <span className="account-nav-subtitle">Visa •••• 5687</span>
            </div>
          </a>

          {/* Shipping Addresses */}
          <a href="#" className="account-nav-item">
            <svg className="account-nav-icon" viewBox="0 0 24 24" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M4.00024 22C2.89568 22 2.00024 21.1046 2.00024 20V10.3C2.00024 9.78645 2.19779 9.29257 2.55197 8.92069L10.1899 0.900862C11.1751 -0.133621 12.8254 -0.133621 13.8106 0.900862L21.4485 8.92069C21.8027 9.29257 22.0002 9.78645 22.0002 10.3V20C22.0002 21.1046 21.1048 22 20.0002 22H4.00024ZM20.0002 10.3V20H16.0002V13C16.0002 12.4477 15.5525 12 15.0002 12H9.00024C8.44796 12 8.00024 12.4477 8.00024 13V20H4.00024V10.3L11.6382 2.28017C11.8352 2.07328 12.1653 2.07328 12.3623 2.28017L20.0002 10.3ZM10.0002 20V14H14.0002V20H10.0002Z" fill="currentColor"/>
            </svg>
            <div className="account-nav-content">
              <span className="account-nav-title">Shipping Addresses</span>
              <span className="account-nav-subtitle">USA My Adrs Pl</span>
            </div>
          </a>

          {/* Settings Section */}
          <div className="account-section-title">Settings</div>

          <a href="#" className="account-nav-item">
            <svg className="account-nav-icon" viewBox="0 0 24 24" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M0 12C0 5.37258 5.37258 0 12 0C18.6274 0 24 5.37258 24 12C24 18.6274 18.6274 24 12 24C5.37258 24 0 18.6274 0 12ZM3.64743 17.5006C2.60612 15.9226 2 14.0321 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 14.0324 21.3937 15.9232 20.3521 17.5014C19.9802 16.9365 19.5511 16.4095 19.0706 15.9289C18.142 15.0003 17.0396 14.2638 15.8263 13.7612C15.3993 13.5843 14.9614 13.4376 14.516 13.3218C16.0017 12.455 17 10.8441 17 9C17 6.23858 14.7614 4 12 4C9.23859 4 7.00002 6.23858 7.00002 9C7.00002 10.844 7.99821 12.4548 9.48373 13.3216C9.03806 13.4375 8.59996 13.5842 8.17266 13.7612C6.9594 14.2638 5.85701 15.0003 4.92842 15.9289C4.44812 16.4092 4.01919 16.936 3.64743 17.5006ZM4.99451 19.136C6.79873 20.9075 9.27178 22 12 22C14.7279 22 17.2007 20.9077 19.0048 19.1367C18.6425 18.4797 18.1889 17.8757 17.6563 17.3431C16.9135 16.6003 16.0316 16.011 15.061 15.609C14.0904 15.2069 13.0501 15 11.9995 15C10.9489 15 9.90863 15.2069 8.93802 15.609C7.96742 16.011 7.08551 16.6003 6.34264 17.3431C5.81024 17.8755 5.35674 18.4794 4.99451 19.136ZM12 6C10.3432 6 9.00002 7.34315 9.00002 9C9.00002 10.6569 10.3432 12 12 12C13.6569 12 15 10.6569 15 9C15 7.34315 13.6569 6 12 6Z" fill="currentColor"/>
            </svg>
            <span className="account-nav-title">Personal Info</span>
          </a>

          <a href="#" className="account-nav-item">
            <svg className="account-nav-icon" viewBox="0 0 24 24" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M3 3C1.34315 3 0 4.34315 0 6V18C0 19.6569 1.34314 21 3 21H21C22.6569 21 24 19.6569 24 18V6C24 4.34315 22.6569 3 21 3H3ZM2 17.5858L7.91601 11.6698L2 6.34536V17.5858ZM9.40466 13.0096L3.41421 19H20.5858L14.5953 13.0096L13.3379 14.1412C12.5773 14.8258 11.4227 14.8258 10.6621 14.1412L9.40466 13.0096ZM22 6.34536V17.5858L16.084 11.6698L22 6.34536ZM3.49485 5L12 12.6546L20.5052 5H3.49485Z" fill="currentColor"/>
            </svg>
            <span className="account-nav-title">Communications</span>
          </a>

          <a href="#" className="account-nav-item">
            <svg className="account-nav-icon" viewBox="0 0 24 24" fill="none">
              <path d="M8.89084 13.4375C8.77834 13.4375 8.67709 13.3362 8.67709 13.2237V5.65248C8.67709 5.53998 8.77834 5.44998 8.89084 5.44998H9.05959C9.13834 5.44998 9.19459 5.47248 9.25084 5.52873L13.8408 10.4225H13.8633V5.77623C13.8633 5.66373 13.9533 5.56248 14.0771 5.56248H15.1121C15.2246 5.56248 15.3258 5.66373 15.3258 5.77623V13.3475C15.3258 13.46 15.2246 13.55 15.1121 13.55H14.9546C14.8758 13.55 14.8196 13.5275 14.7633 13.4712L10.1508 8.38623H10.1283V13.2237C10.1283 13.3362 10.0383 13.4375 9.91459 13.4375H8.89084Z" fill="currentColor"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M4 2C2.89543 2 2 2.89543 2 4V20C2 21.1046 2.89543 22 4 22H20C21.1046 22 22 21.1046 22 20V4C22 2.89543 21.1046 2 20 2H4ZM20 4H4V20H7V16C7 15.4477 7.44772 15 8 15H16C16.5523 15 17 15.4477 17 16V20H20V4ZM11 20H9V17H11V20ZM15 20H13V17H15V20Z" fill="currentColor"/>
            </svg>
            <div className="account-nav-content">
              <span className="account-nav-title">Your Store</span>
              <span className="account-nav-subtitle">Nordstrom Michigan Ave</span>
            </div>
          </a>

          {/* Profile Section */}
          <div className="account-section-title">Profile</div>

          <a href="#" className="account-nav-item">
            <svg className="account-nav-icon" viewBox="0 0 24 24" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M13 4.5C13 3.11929 14.1193 2 15.5 2H19.5C20.8807 2 22 3.11929 22 4.5V8.5C22 9.88071 20.8807 11 19.5 11H15.5C14.1193 11 13 9.88071 13 8.5V4.5ZM15.5 4C15.2239 4 15 4.22386 15 4.5V8.5C15 8.77614 15.2239 9 15.5 9H19.5C19.7761 9 20 8.77614 20 8.5V4.5C20 4.22386 19.7761 4 19.5 4H15.5Z" fill="currentColor"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M4.5 13C3.11929 13 2 14.1193 2 15.5V19.5C2 20.8807 3.11929 22 4.5 22H8.5C9.88071 22 11 20.8807 11 19.5V15.5C11 14.1193 9.88071 13 8.5 13H4.5ZM4 15.5C4 15.2239 4.22386 15 4.5 15H8.5C8.77614 15 9 15.2239 9 15.5V19.5C9 19.7761 8.77614 20 8.5 20H4.5C4.22386 20 4 19.7761 4 19.5V15.5Z" fill="currentColor"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M15.5 13C14.1193 13 13 14.1193 13 15.5V19.5C13 20.8807 14.1193 22 15.5 22H19.5C20.8807 22 22 20.8807 22 19.5V15.5C22 14.1193 20.8807 13 19.5 13H15.5ZM15 15.5C15 15.2239 15.2239 15 15.5 15H19.5C19.7761 15 20 15.2239 20 15.5V19.5C20 19.7761 19.7761 20 19.5 20H15.5C15.2239 20 15 19.7761 15 19.5V15.5Z" fill="currentColor"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M4.5 2C3.11929 2 2 3.11929 2 4.5V8.5C2 9.88071 3.11929 11 4.5 11H8.5C9.88071 11 11 9.88071 11 8.5V4.5C11 3.11929 9.88071 2 8.5 2H4.5ZM4 4.5C4 4.22386 4.22386 4 4.5 4H8.5C8.77614 4 9 4.22386 9 4.5V8.5C9 8.77614 8.77614 9 8.5 9H4.5C4.22386 9 4 8.77614 4 8.5V4.5Z" fill="currentColor"/>
            </svg>
            <span className="account-nav-title">Your Brands</span>
          </a>

          <a href="#" className="account-nav-item">
            <svg className="account-nav-icon" viewBox="0 0 24 24" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M5 6C4.44772 6 4 6.44772 4 7C4 7.55228 4.44772 8 5 8H17C18.6569 8 20 9.34315 20 11V17C20 18.6569 18.6569 20 17 20H1C0.447715 20 0 19.5523 0 19V13C0 12.4477 0.447715 12 1 12H2V7C2 5.34315 3.34315 4 5 4H23C23.5523 4 24 4.44772 24 5V11C24 11.5523 23.5523 12 23 12H22C21.4477 12 21 11.5523 21 11C21 10.4477 21.4477 10 22 10V6H5ZM4 9.82929V12H17C17.5523 12 18 11.5523 18 11C18 10.4477 17.5523 10 17 10H5C4.64936 10 4.31278 9.93985 4 9.82929ZM2 14V18H6V14H2ZM15 17C14.4477 17 14 16.5523 14 16V14H12V15C12 15.5523 11.5523 16 11 16C10.4477 16 10 15.5523 10 15V14H8V18H17C17.5523 18 18 17.5523 18 17V13.8293C17.6872 13.9398 17.3506 14 17 14H16V16C16 16.5523 15.5523 17 15 17Z" fill="currentColor"/>
            </svg>
            <span className="account-nav-title">Your Sizes</span>
          </a>

          <a href="#" className="account-nav-item active">
            <svg className="account-nav-icon" viewBox="0 0 24 24" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M1.10793 11.4381C-0.104173 11.0086 -0.104174 9.29447 1.10793 8.86498L6.11561 7.09059L7.89 2.08291C8.31949 0.870801 10.0337 0.870803 10.4632 2.08291L12.2376 7.09059L17.2452 8.86498C18.4573 9.29447 18.4573 11.0086 17.2452 11.4381L12.2376 13.2125L10.4632 18.2202C10.0337 19.4323 8.31949 19.4323 7.89 18.2202L6.11561 13.2125L1.10793 11.4381ZM11.5696 11.3274C11.0011 11.5288 10.5538 11.976 10.3524 12.5446L9.17658 15.8629L8.00077 12.5446C7.79933 11.976 7.35209 11.5288 6.78359 11.3274L3.46521 10.1516L6.78359 8.97574C7.35209 8.7743 7.79933 8.32707 8.00077 7.75856L9.17658 4.44018L10.3524 7.75856C10.5538 8.32707 11.0011 8.7743 11.5696 8.97574L14.888 10.1516L11.5696 11.3274Z" fill="currentColor"/>
              <path fillRule="evenodd" clipRule="evenodd" d="M19.9555 14.3029L20.8427 16.8068L23.3466 17.694C23.9526 17.9087 23.9526 18.7658 23.3466 18.9805L20.8427 19.8677L19.9555 22.3716C19.7408 22.9776 18.8837 22.9776 18.6689 22.3716L17.7817 19.8677L15.2779 18.9805C14.6719 18.7658 14.6719 17.9087 15.2779 17.694L17.7817 16.8068L18.6689 14.3029C18.8837 13.6969 19.7408 13.6969 19.9555 14.3029ZM20.5087 18.9252C20.2245 19.0259 20.0009 19.2495 19.9001 19.5338L19.3122 21.1929L18.7243 19.5338C18.6236 19.2495 18.4 19.0259 18.1157 18.9252L16.4565 18.3373L18.1157 17.7493C18.4 17.6486 18.6236 17.425 18.7243 17.1408L19.3122 15.4816L19.9001 17.1408C20.0009 17.425 20.2245 17.6486 20.5087 17.7493L22.1679 18.3373L20.5087 18.9252Z" fill="currentColor"/>
            </svg>
            <div className="account-nav-content">
              <span className="account-nav-title">Your Style</span>
              <span className="account-nav-subtitle">Personalized for you</span>
            </div>
          </a>

          {/* Styling & Services Section */}
          <div className="account-section-title">Styling & Services</div>

          <a href="#" className="account-nav-item">
            <svg className="account-nav-icon" viewBox="0 0 24 24" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M17 1C17.5523 1 18 1.44772 18 2V4H19C20.6569 4 22 5.34315 22 7V19C22 20.6569 20.6569 22 19 22H5C3.34315 22 2 20.6569 2 19V7C2 5.34315 3.34315 4 5 4H6V2C6 1.44772 6.44772 1 7 1C7.55228 1 8 1.44772 8 2V4H16V2C16 1.44772 16.4477 1 17 1ZM5 6C4.44772 6 4 6.44772 4 7V8H20V7C20 6.44772 19.5523 6 19 6H5ZM4 10H20V19C20 19.5523 19.5523 20 19 20H5C4.44772 20 4 19.5523 4 19V10Z" fill="currentColor"/>
            </svg>
            <span className="account-nav-title">Your Appointments</span>
          </a>

          <a href="#" className="account-nav-item">
            <svg className="account-nav-icon" viewBox="0 0 24 24" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M11 3C11 2.44772 11.4477 2 12 2C12.5523 2 13 2.44772 13 3C13 3.283 12.8836 3.5377 12.6932 3.72078L6.42345 8.18293C6.41896 8.1861 6.4145 8.18931 6.41005 8.19256C6.40559 8.19582 6.40116 8.19911 6.39676 8.20243L4.4 9.7C2.88917 10.8331 2 12.6115 2 14.5V17C2 17.5523 2.44772 18 3 18C3.55228 18 4 17.5523 4 17V14.5C4 13.241 4.59278 12.0554 5.6 11.3L7.59001 9.80749L7.81295 9.64883C7.8226 9.67332 7.83246 9.69774 7.84254 9.72208C8.06869 10.268 8.40016 10.7641 8.81802 11.182C9.23588 11.5998 9.73196 11.9313 10.2779 12.1575C10.8239 12.3836 11.4091 12.5 12 12.5C12.5909 12.5 13.1761 12.3836 13.7221 12.1575C14.268 11.9313 14.7641 11.5998 15.182 11.182C15.5998 10.7641 15.9313 10.268 16.1575 9.72208C16.1675 9.69774 16.1774 9.67332 16.187 9.64882L16.41 9.80748L18.4 11.3C19.4072 12.0554 20 13.241 20 14.5V17C20 17.5523 20.4477 18 21 18C21.5523 18 22 17.5523 22 17V14.5C22 12.6115 21.1108 10.8331 19.6 9.7L17.6031 8.20233C17.5992 8.19937 17.5952 8.19644 17.5913 8.19353C17.5863 8.18991 17.5814 8.18635 17.5764 8.18284L13.7246 5.44151L13.9028 5.31473C13.9312 5.29451 13.9585 5.27282 13.9846 5.24974C14.6058 4.70149 15 3.89616 15 3C15 1.34315 13.6569 0 12 0C10.3431 0 9 1.34315 9 3C9 3.55228 9.44772 4 10 4C10.5523 4 11 3.55228 11 3ZM14.464 8.42256L12 6.66891L9.53597 8.42256C9.56732 8.60536 9.61899 8.78454 9.6903 8.95671C9.81594 9.26002 10.0001 9.53562 10.2322 9.76777C10.4644 9.99991 10.74 10.1841 11.0433 10.3097C11.3466 10.4353 11.6717 10.5 12 10.5C12.3283 10.5 12.6534 10.4353 12.9567 10.3097C13.26 10.1841 13.5356 9.99991 13.7678 9.76777C13.9999 9.53562 14.1841 9.26002 14.3097 8.95671C14.381 8.78454 14.4327 8.60536 14.464 8.42256Z" fill="currentColor"/>
              <path d="M7 14C7.55228 14 8 14.4477 8 15V22H16V15C16 14.4477 16.4477 14 17 14C17.5523 14 18 14.4477 18 15V23C18 23.5523 17.5523 24 17 24H7C6.44772 24 6 23.5523 6 23V15C6 14.4477 6.44772 14 7 14Z" fill="currentColor"/>
            </svg>
            <span className="account-nav-title">Your Stylists</span>
          </a>

          {/* Customer Service Help */}
          <div className="account-help">
            <div className="account-help-title">Need Help?</div>
            <a href="#" className="account-help-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12.5769 13.5167H11.0019C10.8075 13.5167 10.6325 13.3611 10.6325 13.1472V12.3306C10.6325 11.3366 11.415 10.6748 12.138 10.0634C12.7586 9.53857 13.3352 9.05092 13.3352 8.42222C13.3352 7.72222 12.7519 7.11944 11.7797 7.11944C10.8599 7.11944 10.3376 7.57549 9.96814 7.89815C9.86116 7.99157 9.76699 8.0738 9.67968 8.13056C9.52412 8.22778 9.38801 8.22778 9.2519 8.11111L8.33801 7.21667C8.18246 7.08056 8.2019 6.84722 8.33801 6.71111C8.33801 6.71111 9.66023 5 12.1491 5C14.1908 5 15.9213 6.36111 15.9213 8.26667C15.9213 9.64726 14.9037 10.4521 14.0627 11.1172C13.4704 11.5855 12.9658 11.9846 12.9658 12.4667V13.1083C12.9658 13.3417 12.8297 13.5167 12.5769 13.5167Z" fill="currentColor"/>
                <path d="M11.7797 19C10.9047 19 10.1852 18.2806 10.1852 17.4056C10.1852 16.5306 10.9047 15.7917 11.7797 15.7917C12.6547 15.7917 13.3936 16.5306 13.3936 17.4056C13.3936 18.2806 12.6547 19 11.7797 19Z" fill="currentColor"/>
                <path fillRule="evenodd" clipRule="evenodd" d="M24 12C24 18.6274 18.6274 24 12 24C5.37258 24 0 18.6274 0 12C0 5.37258 5.37258 0 12 0C18.6274 0 24 5.37258 24 12ZM22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" fill="currentColor"/>
              </svg>
              <span>Customer Service</span>
            </a>
          </div>
        </aside>

        {/* Account Content */}
        <main className="account-content">
          <div className="customer-content view-content active" id="profileView">
            {/* Data Page Link (Top Right) */}
            <a href="#" className="data-page-link" title="View Style Data" onClick={(e) => e.preventDefault()}>
              <svg className="beaker-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5.5 1.5H10.5M6.5 1.5V6L3.5 11.5C3.16667 12.1667 3.33333 13 4 13.5H12C12.6667 13 12.8333 12.1667 12.5 11.5L9.5 6V1.5M8 9.5L9.5 7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Style Data</span>
            </a>

            {/* Editorial Hero */}
            <div className="profile-section-animated">
              <EditorialHero
              topPillars={top3Pillars}
              customerName={profile.customer_name}
              sessionsProcessed={profile.sessions_processed}
              lifestyleImages={lifestyleImages}
              gender={profile.gender}
            />
            </div>

            {/* Profile Overview with Radar Chart */}
            <div className="profile-section-animated">
              <ProfileOverview
                pillars={profile.pillars}
                customerName={profile.customer_name}
              />
            </div>

            {/* Pillar Cards - Top 3 */}
            <div className="profile-section-animated">
              <PillarCards pillars={profile.pillars} count={3} />
            </div>

            {/* Style Patterns - Insights */}
            <div className="profile-section-animated">
              <StylePatterns pillars={profile.pillars} />
            </div>

            {/* Cross Links - More ways to explore */}
            <div className="profile-section-animated">
              <CrossLinks customerId={profile.customer_id} />
            </div>
          </div>
        </main>
      </div>
    </main>
    </>
  );
}
