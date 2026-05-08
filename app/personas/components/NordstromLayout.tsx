/**
 * Nordstrom Layout Component
 * Full header, navigation, and account sidebar
 */

interface NordstromLayoutProps {
  customerName: string;
  children: React.ReactNode;
}

export default function NordstromLayout({ customerName, children }: NordstromLayoutProps) {
  return (
    <div className="customer-view">
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
            <span className="site-action-text">{customerName}</span>
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
              <span>{customerName}'s Account</span>
            </h2>
          </div>

          <a href="#" className="account-nav-item active">
            <svg className="account-nav-icon" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor"/>
              <circle cx="12" cy="12" r="3" fill="currentColor"/>
            </svg>
            <div className="account-nav-content">
              <span className="account-nav-title">Your Style Profile</span>
              <span className="account-nav-subtitle">Personalized for you</span>
            </div>
          </a>

          <a href="#" className="account-nav-item">
            <svg className="account-nav-icon" viewBox="0 0 24 24" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M11.1877 1.26662C11.7049 1.03678 12.2951 1.03678 12.8123 1.26662L22.4061 5.53055C22.7673 5.69106 23 6.04918 23 6.44437V16.9056C23 17.696 22.5345 18.4122 21.8123 18.7332L12.8123 22.7332C12.2951 22.9631 11.7049 22.9631 11.1877 22.7332L2.18772 18.7332C1.46547 18.4122 1 17.696 1 16.9056V6.44437C1 6.04918 1.23273 5.69106 1.59386 5.53055L11.1877 1.26662ZM3 16.9056L11 20.4612V11.6373L3 7.91115V16.9056ZM4.52642 6.41583L6.97136 7.55468L14.3272 4.12854L12 3.09424L4.52642 6.41583ZM16.7511 5.20584L9.33984 8.65781L12 9.89677L19.4735 6.4158L16.7511 5.20584ZM21 7.91111L13 11.6373V20.4612L21 16.9056V7.91111Z" fill="currentColor"/>
            </svg>
            <div className="account-nav-content">
              <span className="account-nav-title">Purchases</span>
              <span className="account-nav-subtitle">Track & manage orders</span>
            </div>
          </a>

          <a href="#" className="account-nav-item">
            <svg className="account-nav-icon" viewBox="0 0 24 24" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M0.000244141 8.75C0.000244141 5.02208 3.02232 2 6.75024 2C8.87178 2 10.7634 2.9787 12.0002 4.5073C13.2371 2.9787 15.1287 2 17.2502 2C20.9782 2 24.0002 5.02208 24.0002 8.75C24.0002 12.7009 21.1472 16.1603 18.4721 18.5682C15.7458 21.0223 12.9324 22.6252 12.531 22.8492C12.3988 22.923 12.218 22.9884 12.0002 22.9884C11.7825 22.9884 11.6017 22.923 11.4695 22.8492C11.0681 22.6252 8.25466 21.0223 5.52836 18.5682C2.85324 16.1603 0.000244141 12.7009 0.000244141 8.75ZM6.75024 4C4.12689 4 2.00024 6.12665 2.00024 8.75C2.00024 11.7828 4.25066 14.7272 6.8664 17.0817C8.93547 18.9442 11.0698 20.2922 12.0002 20.8457C12.9307 20.2922 15.065 18.9442 17.1341 17.0817C19.7498 14.7272 22.0002 11.7828 22.0002 8.75C22.0002 6.12665 19.8736 4 17.2502 4C15.3196 4 13.6558 5.15193 12.9128 6.81019C12.7517 7.16983 12.3943 7.4013 12.0002 7.4013C11.6061 7.4013 11.2488 7.16983 11.0877 6.81019C10.3447 5.15193 8.6809 4 6.75024 4Z" fill="currentColor"/>
            </svg>
            <div className="account-nav-content">
              <span className="account-nav-title">Wish Lists</span>
              <span className="account-nav-subtitle">Create & manage lists</span>
            </div>
          </a>

          <a href="#" className="account-nav-item">
            <svg className="account-nav-icon" viewBox="0 0 24 24" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0ZM2 12C2 6.47715 6.47715 2 12 2C14.5096 2 16.8033 2.92445 18.5591 4.4514C18.0955 4.99164 17.5982 5.66343 17.0882 6.40203C16.2983 7.54606 15.4312 8.92042 14.549 10.368C13.6793 11.795 12.8147 13.2591 11.9848 14.6641C11.599 15.3175 11.2206 15.9582 10.8528 16.5764C11.2075 12.9895 11.8885 8.44051 12.5638 5.52508C12.715 4.87213 12.3631 4.30234 11.8746 4.06143C11.3747 3.81486 10.6823 3.89332 10.2693 4.46045C7.8582 7.77167 4.86819 13.5212 3.42236 17.1434C2.5193 15.6406 2 13.8809 2 12ZM4.86164 19.0031C6.67634 20.8527 9.20418 22 12 22C17.5228 22 22 17.5228 22 12C22 9.71183 21.2315 7.60316 19.9385 5.91802C19.5884 6.34198 19.184 6.88665 18.734 7.5384C17.9762 8.63603 17.132 9.97281 16.2569 11.4088C15.4359 12.7559 14.5677 14.2248 13.7266 15.6481C12.8127 17.1944 11.9307 18.6866 11.1759 19.91C10.4461 21.0929 8.56689 20.6018 8.64568 19.1242C8.79162 16.3871 9.29842 12.223 9.90484 8.68386C7.80079 12.2133 5.68751 16.5877 4.86164 19.0031Z" fill="currentColor"/>
            </svg>
            <div className="account-nav-content">
              <span className="account-nav-title">Nordy Club Rewards</span>
              <span className="account-nav-subtitle">View points & benefits</span>
            </div>
          </a>
        </aside>

        {/* Main Content Area */}
        <div className="account-content">
          {children}
        </div>
      </div>
    </div>
  );
}
