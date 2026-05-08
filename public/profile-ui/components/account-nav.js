/**
 * Reusable Account Navigation Component (Correct Version from index.html)
 * Nordstrom branded account sidebar with official Nordstrom icons
 */

export function renderAccountNav(options = {}) {
  const {
    activeItem = '',
    userName = 'Brian',
    rewardsAmount = '$9.91',
    lastPaymentDigits = '5687',
    primaryAddress = 'USA My Adrs Pl',
    storeName = 'Nordstrom Michigan Avenue'
  } = options;

  const isActive = (item) => activeItem === item ? 'active' : '';

  return `
    <aside class="account-sidebar">
      <div class="account-header">
        <h2 class="account-header-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M0 12C0 5.37258 5.37258 0 12 0C18.6274 0 24 5.37258 24 12C24 18.6274 18.6274 24 12 24C5.37258 24 0 18.6274 0 12ZM3.64743 17.5006C2.60612 15.9226 2 14.0321 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 14.0324 21.3937 15.9232 20.3521 17.5014C19.9802 16.9365 19.5511 16.4095 19.0706 15.9289C18.142 15.0003 17.0396 14.2638 15.8263 13.7612C15.3993 13.5843 14.9614 13.4376 14.516 13.3218C16.0017 12.455 17 10.8441 17 9C17 6.23858 14.7614 4 12 4C9.23859 4 7.00002 6.23858 7.00002 9C7.00002 10.844 7.99821 12.4548 9.48373 13.3216C9.03806 13.4375 8.59996 13.5842 8.17266 13.7612C6.9594 14.2638 5.85701 15.0003 4.92842 15.9289C4.44812 16.4092 4.01919 16.936 3.64743 17.5006ZM4.99451 19.136C6.79873 20.9075 9.27178 22 12 22C14.7279 22 17.2007 20.9077 19.0048 19.1367C18.6425 18.4797 18.1889 17.8757 17.6563 17.3431C16.9135 16.6003 16.0316 16.011 15.061 15.609C14.0904 15.2069 13.0501 15 11.9995 15C10.9489 15 9.90863 15.2069 8.93802 15.609C7.96742 16.011 7.08551 16.6003 6.34264 17.3431C5.81024 17.8755 5.35674 18.4794 4.99451 19.136ZM12 6C10.3432 6 9.00002 7.34315 9.00002 9C9.00002 10.6569 10.3432 12 12 12C13.6569 12 15 10.6569 15 9C15 7.34315 13.6569 6 12 6Z" fill="currentColor"/>
          </svg>
          <span>${userName}'s Account</span>
        </h2>
      </div>

      <a href="#" class="account-nav-item ${isActive('account-info')}">
        <svg class="account-nav-icon" viewBox="0 0 24 24" fill="none">
          <g clip-path="url(#clip0_account_info)">
            <g clip-path="url(#clip1_account_info)">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M0 12C0 5.37258 5.37258 0 12 0C18.6274 0 24 5.37258 24 12C24 18.6274 18.6274 24 12 24C5.37258 24 0 18.6274 0 12ZM3.64743 17.5006C2.60612 15.9226 2 14.0321 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 14.0324 21.3937 15.9232 20.3521 17.5014C19.9802 16.9365 19.5511 16.4095 19.0706 15.9289C18.142 15.0003 17.0396 14.2638 15.8263 13.7612C15.3993 13.5843 14.9614 13.4376 14.516 13.3218C16.0017 12.455 17 10.8441 17 9C17 6.23858 14.7614 4 12 4C9.23859 4 7.00002 6.23858 7.00002 9C7.00002 10.844 7.99821 12.4548 9.48373 13.3216C9.03806 13.4375 8.59996 13.5842 8.17266 13.7612C6.9594 14.2638 5.85701 15.0003 4.92842 15.9289C4.44812 16.4092 4.01919 16.936 3.64743 17.5006ZM4.99451 19.136C6.79873 20.9075 9.27178 22 12 22C14.7279 22 17.2007 20.9077 19.0048 19.1367C18.6425 18.4797 18.1889 17.8757 17.6563 17.3431C16.9135 16.6003 16.0316 16.011 15.061 15.609C14.0904 15.2069 13.0501 15 11.9995 15C10.9489 15 9.90863 15.2069 8.93802 15.609C7.96742 16.011 7.08551 16.6003 6.34264 17.3431C5.81024 17.8755 5.35674 18.4794 4.99451 19.136ZM12 6C10.3432 6 9.00002 7.34315 9.00002 9C9.00002 10.6569 10.3432 12 12 12C13.6569 12 15 10.6569 15 9C15 7.34315 13.6569 6 12 6Z" fill="currentColor"/>
            </g>
          </g>
          <defs>
            <clipPath id="clip0_account_info">
              <rect width="24" height="24" rx="5" fill="white"/>
            </clipPath>
            <clipPath id="clip1_account_info">
              <rect width="24" height="24" fill="white"/>
            </clipPath>
          </defs>
        </svg>
        <span class="account-nav-title">Account Info</span>
      </a>

      <a href="#" class="account-nav-item ${isActive('purchases')}">
        <svg class="account-nav-icon" viewBox="0 0 24 24" fill="none">
          <g clip-path="url(#clip0_purchases)">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M11.1877 1.26662C11.7049 1.03678 12.2951 1.03678 12.8123 1.26662L22.4061 5.53055C22.7673 5.69106 23 6.04918 23 6.44437V16.9056C23 17.696 22.5345 18.4122 21.8123 18.7332L12.8123 22.7332C12.2951 22.9631 11.7049 22.9631 11.1877 22.7332L2.18772 18.7332C1.46547 18.4122 1 17.696 1 16.9056V6.44437C1 6.04918 1.23273 5.69106 1.59386 5.53055L11.1877 1.26662ZM3 16.9056L11 20.4612V11.6373L3 7.91115V16.9056ZM4.52642 6.41583L6.97136 7.55468L14.3272 4.12854L12 3.09424L4.52642 6.41583ZM16.7511 5.20584L9.33984 8.65781L12 9.89677L19.4735 6.4158L16.7511 5.20584ZM21 7.91111L13 11.6373V20.4612L21 16.9056V7.91111Z" fill="currentColor"/>
          </g>
          <defs>
            <clipPath id="clip0_purchases">
              <rect width="24" height="24" rx="5" fill="white"/>
            </clipPath>
          </defs>
        </svg>
        <div class="account-nav-content">
          <span class="account-nav-title">Purchases</span>
          <span class="account-nav-subtitle">Track, Manage & Return</span>
        </div>
      </a>

      <a href="#" class="account-nav-item ${isActive('wishlists')}">
        <svg class="account-nav-icon" viewBox="0 0 24 24" fill="none">
          <g clip-path="url(#clip0_wishlists)">
            <g clip-path="url(#clip1_wishlists)">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M0.000244141 8.75C0.000244141 5.02208 3.02232 2 6.75024 2C8.87178 2 10.7634 2.9787 12.0002 4.5073C13.2371 2.9787 15.1287 2 17.2502 2C20.9782 2 24.0002 5.02208 24.0002 8.75C24.0002 12.7009 21.1472 16.1603 18.4721 18.5682C15.7458 21.0223 12.9324 22.6252 12.531 22.8492C12.3988 22.923 12.218 22.9884 12.0002 22.9884C11.7825 22.9884 11.6017 22.923 11.4695 22.8492C11.0681 22.6252 8.25466 21.0223 5.52836 18.5682C2.85324 16.1603 0.000244141 12.7009 0.000244141 8.75ZM6.75024 4C4.12689 4 2.00024 6.12665 2.00024 8.75C2.00024 11.7828 4.25066 14.7272 6.8664 17.0817C8.93547 18.9442 11.0698 20.2922 12.0002 20.8457C12.9307 20.2922 15.065 18.9442 17.1341 17.0817C19.7498 14.7272 22.0002 11.7828 22.0002 8.75C22.0002 6.12665 19.8736 4 17.2502 4C15.3196 4 13.6558 5.15193 12.9128 6.81019C12.7517 7.16983 12.3943 7.4013 12.0002 7.4013C11.6061 7.4013 11.2488 7.16983 11.0877 6.81019C10.3447 5.15193 8.6809 4 6.75024 4Z" fill="currentColor"/>
            </g>
          </g>
          <defs>
            <clipPath id="clip0_wishlists">
              <rect width="24" height="24" rx="5" fill="white"/>
            </clipPath>
            <clipPath id="clip1_wishlists">
              <rect width="24" height="24" fill="white"/>
            </clipPath>
          </defs>
        </svg>
        <div class="account-nav-content">
          <span class="account-nav-title">Wish Lists</span>
          <span class="account-nav-subtitle">Create & manage lists</span>
        </div>
      </a>

      <a href="#" class="account-nav-item ${isActive('rewards')}">
        <svg class="account-nav-icon" viewBox="0 0 24 24" fill="none">
          <g clip-path="url(#clip0_nordy_club)">
            <g clip-path="url(#clip1_nordy_club)">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M12 0C5.37258 0 0 5.37258 0 12C0 18.6274 5.37258 24 12 24C18.6274 24 24 18.6274 24 12C24 5.37258 18.6274 0 12 0ZM2 12C2 6.47715 6.47715 2 12 2C14.5096 2 16.8033 2.92445 18.5591 4.4514C18.0955 4.99164 17.5982 5.66343 17.0882 6.40203C16.2983 7.54606 15.4312 8.92042 14.549 10.368C13.6793 11.795 12.8147 13.2591 11.9848 14.6641C11.599 15.3175 11.2206 15.9582 10.8528 16.5764C11.2075 12.9895 11.8885 8.44051 12.5638 5.52508C12.715 4.87213 12.3631 4.30234 11.8746 4.06143C11.3747 3.81486 10.6823 3.89332 10.2693 4.46045C7.8582 7.77167 4.86819 13.5212 3.42236 17.1434C2.5193 15.6406 2 13.8809 2 12ZM4.86164 19.0031C6.67634 20.8527 9.20418 22 12 22C17.5228 22 22 17.5228 22 12C22 9.71183 21.2315 7.60316 19.9385 5.91802C19.5884 6.34198 19.184 6.88665 18.734 7.5384C17.9762 8.63603 17.132 9.97281 16.2569 11.4088C15.4359 12.7559 14.5677 14.2248 13.7266 15.6481C12.8127 17.1944 11.9307 18.6866 11.1759 19.91C10.4461 21.0929 8.56689 20.6018 8.64568 19.1242C8.79162 16.3871 9.29842 12.223 9.90484 8.68386C7.80079 12.2133 5.68751 16.5877 4.86164 19.0031Z" fill="currentColor"/>
            </g>
          </g>
          <defs>
            <clipPath id="clip0_nordy_club">
              <rect width="24" height="24" rx="5" fill="white"/>
            </clipPath>
            <clipPath id="clip1_nordy_club">
              <rect width="24" height="24" fill="white"/>
            </clipPath>
          </defs>
        </svg>
        <div class="account-nav-content">
          <span class="account-nav-title">Nordy Club Rewards</span>
          <span class="account-nav-subtitle">${rewardsAmount} available towards...</span>
        </div>
      </a>

      <a href="#" class="account-nav-item ${isActive('payment')}">
        <svg class="account-nav-icon" viewBox="0 0 24 24" fill="none">
          <g clip-path="url(#clip0_payment)">
            <path d="M7.85443 17.25C7.70443 17.25 7.56943 17.115 7.56943 16.965V6.87C7.56943 6.72 7.70443 6.6 7.85443 6.6H8.07943C8.18443 6.6 8.25943 6.63 8.33443 6.705L14.4544 13.23H14.4844V7.035C14.4844 6.885 14.6044 6.75 14.7694 6.75H16.1494C16.2994 6.75 16.4344 6.885 16.4344 7.035V17.13C16.4344 17.28 16.2994 17.4 16.1494 17.4H15.9394C15.8344 17.4 15.7594 17.37 15.6844 17.295L9.53443 10.515H9.50443V16.965C9.50443 17.115 9.38443 17.25 9.21943 17.25H7.85443Z" fill="currentColor"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M3 3C1.34315 3 0 4.34315 0 6V18C0 19.6569 1.34314 21 3 21H21C22.6569 21 24 19.6569 24 18V6C24 4.34315 22.6569 3 21 3H3ZM2 6C2 5.44772 2.44772 5 3 5H21C21.5523 5 22 5.44771 22 6V18C22 18.5523 21.5523 19 21 19H3C2.44772 19 2 18.5523 2 18V6Z" fill="currentColor"/>
          </g>
          <defs>
            <clipPath id="clip0_payment">
              <rect width="24" height="24" rx="5" fill="white"/>
            </clipPath>
          </defs>
        </svg>
        <div class="account-nav-content">
          <span class="account-nav-title">Payment Methods</span>
          <span class="account-nav-subtitle">Nordstrom Visa ${lastPaymentDigits}</span>
        </div>
      </a>

      <a href="#" class="account-nav-item ${isActive('shipping')}">
        <svg class="account-nav-icon" viewBox="0 0 24 24" fill="none">
          <g clip-path="url(#clip0_shipping)">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M12 5C9.79086 5 8 6.79086 8 9C8 11.2091 9.79086 13 12 13C14.2091 13 16 11.2091 16 9C16 6.79086 14.2091 5 12 5ZM10 9C10 7.89543 10.8954 7 12 7C13.1046 7 14 7.89543 14 9C14 10.1046 13.1046 11 12 11C10.8954 11 10 10.1046 10 9Z" fill="currentColor"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M12 0C7.02944 0 3 4.02944 3 9C3 10.9547 3.6243 12.7665 4.68422 14.2431L10.3583 22.3927C11.1541 23.5357 12.8452 23.5357 13.641 22.3928L19.3059 14.2569C20.3718 12.7778 21 10.9608 21 9C21 4.02944 16.9706 0 12 0ZM5 9C5 5.13401 8.13401 2 12 2C15.866 2 19 5.13401 19 9C19 10.5298 18.5104 11.9422 17.6793 13.0932L17.6693 13.1072L11.9997 21.2499L6.32134 13.0943L6.31253 13.0818C5.48634 11.9329 5 10.5247 5 9Z" fill="currentColor"/>
          </g>
          <defs>
            <clipPath id="clip0_shipping">
              <rect width="24" height="24" rx="5" fill="white"/>
            </clipPath>
          </defs>
        </svg>
        <div class="account-nav-content">
          <span class="account-nav-title">Shipping Addresses</span>
          <span class="account-nav-subtitle">${primaryAddress}</span>
        </div>
      </a>

      <div class="account-section-title">Settings</div>

      <a href="#" class="account-nav-item ${isActive('personal-info')}">
        <svg class="account-nav-icon" viewBox="0 0 24 24" fill="none">
          <g clip-path="url(#clip0_personal_info)">
            <g clip-path="url(#clip1_personal_info)">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M0 12C0 5.37258 5.37258 0 12 0C18.6274 0 24 5.37258 24 12C24 18.6274 18.6274 24 12 24C5.37258 24 0 18.6274 0 12ZM3.64743 17.5006C2.60612 15.9226 2 14.0321 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 14.0324 21.3937 15.9232 20.3521 17.5014C19.9802 16.9365 19.5511 16.4095 19.0706 15.9289C18.142 15.0003 17.0396 14.2638 15.8263 13.7612C15.3993 13.5843 14.9614 13.4376 14.516 13.3218C16.0017 12.455 17 10.8441 17 9C17 6.23858 14.7614 4 12 4C9.23859 4 7.00002 6.23858 7.00002 9C7.00002 10.844 7.99821 12.4548 9.48373 13.3216C9.03806 13.4375 8.59996 13.5842 8.17266 13.7612C6.9594 14.2638 5.85701 15.0003 4.92842 15.9289C4.44812 16.4092 4.01919 16.936 3.64743 17.5006ZM4.99451 19.136C6.79873 20.9075 9.27178 22 12 22C14.7279 22 17.2007 20.9077 19.0048 19.1367C18.6425 18.4797 18.1889 17.8757 17.6563 17.3431C16.9135 16.6003 16.0316 16.011 15.061 15.609C14.0904 15.2069 13.0501 15 11.9995 15C10.9489 15 9.90863 15.2069 8.93802 15.609C7.96742 16.011 7.08551 16.6003 6.34264 17.3431C5.81024 17.8755 5.35674 18.4794 4.99451 19.136ZM12 6C10.3432 6 9.00002 7.34315 9.00002 9C9.00002 10.6569 10.3432 12 12 12C13.6569 12 15 10.6569 15 9C15 7.34315 13.6569 6 12 6Z" fill="currentColor"/>
            </g>
          </g>
          <defs>
            <clipPath id="clip0_personal_info">
              <rect width="24" height="24" rx="5" fill="white"/>
            </clipPath>
            <clipPath id="clip1_personal_info">
              <rect width="24" height="24" fill="white"/>
            </clipPath>
          </defs>
        </svg>
        <div class="account-nav-content">
          <span class="account-nav-title">Personal Info</span>
          <span class="account-nav-subtitle">Password, email, mobile & more</span>
        </div>
      </a>

      <a href="#" class="account-nav-item ${isActive('communications')}">
        <svg class="account-nav-icon" viewBox="0 0 24 24" fill="none">
          <g clip-path="url(#clip0_communications)">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M3 3C1.34315 3 0 4.34315 0 6V18C0 19.6569 1.34314 21 3 21H21C22.6569 21 24 19.6569 24 18V6C24 4.34315 22.6569 3 21 3H3ZM2 17.5858L7.91601 11.6698L2 6.34536V17.5858ZM9.40466 13.0096L3.41421 19H20.5858L14.5953 13.0096L13.3379 14.1412C12.5773 14.8258 11.4227 14.8258 10.6621 14.1412L9.40466 13.0096ZM22 6.34536V17.5858L16.084 11.6698L22 6.34536ZM3.49485 5L12 12.6546L20.5052 5H3.49485Z" fill="currentColor"/>
          </g>
          <defs>
            <clipPath id="clip0_communications">
              <rect width="24" height="24" rx="5" fill="white"/>
            </clipPath>
          </defs>
        </svg>
        <div class="account-nav-content">
          <span class="account-nav-title">Communications</span>
          <span class="account-nav-subtitle">Email & mail preferences</span>
        </div>
      </a>

      <a href="#" class="account-nav-item ${isActive('your-store')}">
        <svg class="account-nav-icon" viewBox="0 0 24 24" fill="none">
          <g clip-path="url(#clip0_your_store)">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M12 5C9.79086 5 8 6.79086 8 9C8 11.2091 9.79086 13 12 13C14.2091 13 16 11.2091 16 9C16 6.79086 14.2091 5 12 5ZM10 9C10 7.89543 10.8954 7 12 7C13.1046 7 14 7.89543 14 9C14 10.1046 13.1046 11 12 11C10.8954 11 10 10.1046 10 9Z" fill="currentColor"/>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M12 0C7.02944 0 3 4.02944 3 9C3 10.9547 3.6243 12.7665 4.68422 14.2431L10.3583 22.3927C11.1541 23.5357 12.8452 23.5357 13.641 22.3928L19.3059 14.2569C20.3718 12.7778 21 10.9608 21 9C21 4.02944 16.9706 0 12 0ZM5 9C5 5.13401 8.13401 2 12 2C15.866 2 19 5.13401 19 9C19 10.5298 18.5104 11.9422 17.6793 13.0932L17.6693 13.1072L11.9997 21.2499L6.32134 13.0943L6.31253 13.0818C5.48634 11.9329 5 10.5247 5 9Z" fill="currentColor"/>
          </g>
          <defs>
            <clipPath id="clip0_your_store">
              <rect width="24" height="24" rx="5" fill="white"/>
            </clipPath>
          </defs>
        </svg>
        <div class="account-nav-content">
          <span class="account-nav-title">Your Store</span>
          <span class="account-nav-subtitle">${storeName}</span>
        </div>
      </a>

      <div class="account-section-title">Profile</div>

      <a href="#" class="account-nav-item ${isActive('your-brands')}">
        <svg class="account-nav-icon" viewBox="0 0 24 24" fill="none">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z" fill="currentColor"/>
        </svg>
        <div class="account-nav-content">
          <span class="account-nav-title">Your Brands</span>
          <span class="account-nav-subtitle">Save the brands you shop</span>
        </div>
      </a>

      <a href="#" class="account-nav-item ${isActive('your-sizes')}">
        <svg class="account-nav-icon" viewBox="0 0 24 24" fill="none">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M3 3h18v2H3V3zm0 4h18v2H3V7zm0 4h18v2H3v-2zm0 4h18v2H3v-2zm0 4h18v2H3v-2z" fill="currentColor"/>
        </svg>
        <div class="account-nav-content">
          <span class="account-nav-title">Your Sizes</span>
          <span class="account-nav-subtitle">Set the sizes you shop</span>
        </div>
      </a>

      <a href="#" class="account-nav-item ${isActive('your-style')}">
        <svg class="account-nav-icon" viewBox="0 0 24 24" fill="none">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M1.10793 11.4381C-0.104173 11.0086 -0.104174 9.29447 1.10793 8.86498L6.11561 7.09059L7.89 2.08291C8.31949 0.870801 10.0337 0.870803 10.4632 2.08291L12.2376 7.09059L17.2452 8.86498C18.4573 9.29447 18.4573 11.0086 17.2452 11.4381L12.2376 13.2125L10.4632 18.2202C10.0337 19.4323 8.31949 19.4323 7.89 18.2202L6.11561 13.2125L1.10793 11.4381ZM11.5696 11.3274C11.0011 11.5288 10.5538 11.976 10.3524 12.5446L9.17658 15.8629L8.00077 12.5446C7.79933 11.976 7.35209 11.5288 6.78359 11.3274L3.46521 10.1516L6.78359 8.97574C7.35209 8.7743 7.79933 8.32707 8.00077 7.75856L9.17658 4.44018L10.3524 7.75856C10.5538 8.32707 11.0011 8.7743 11.5696 8.97574L14.888 10.1516L11.5696 11.3274Z" fill="currentColor"/>
          <path fill-rule="evenodd" clip-rule="evenodd" d="M19.9555 14.3029L20.8427 16.8068L23.3466 17.694C23.9526 17.9087 23.9526 18.7658 23.3466 18.9805L20.8427 19.8677L19.9555 22.3716C19.7408 22.9776 18.8837 22.9776 18.6689 22.3716L17.7817 19.8677L15.2779 18.9805C14.6719 18.7658 14.6719 17.9087 15.2779 17.694L17.7817 16.8068L18.6689 14.3029C18.8837 13.6969 19.7408 13.6969 19.9555 14.3029ZM20.5087 18.9252C20.2245 19.0259 20.0009 19.2495 19.9001 19.5338L19.3122 21.1929L18.7243 19.5338C18.6236 19.2495 18.4 19.0259 18.1157 18.9252L16.4565 18.3373L18.1157 17.7493C18.4 17.6486 18.6236 17.425 18.7243 17.1408L19.3122 15.4816L19.9001 17.1408C20.0009 17.425 20.2245 17.6486 20.5087 17.7493L22.1679 18.3373L20.5087 18.9252Z" fill="currentColor"/>
        </svg>
        <div class="account-nav-content">
          <span class="account-nav-title">Your Style</span>
          <span class="account-nav-subtitle">Take a quiz to find your style</span>
        </div>
      </a>

      <div class="account-section-title">Styling & Services</div>

      <a href="#" class="account-nav-item ${isActive('appointments')}">
        <svg class="account-nav-icon" viewBox="0 0 24 24" fill="none">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M7 2C6.44772 2 6 2.44772 6 3V4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4H18V3C18 2.44772 17.5523 2 17 2C16.4477 2 16 2.44772 16 3V4H8V3C8 2.44772 7.55228 2 7 2ZM6 8V6H5V8H6ZM8 8V6H16V8H8ZM18 8V6H19V8H18ZM19 10H5V20H19V10Z" fill="currentColor"/>
        </svg>
        <div class="account-nav-content">
          <span class="account-nav-title">Your Appointments</span>
          <span class="account-nav-subtitle">Book & manage</span>
        </div>
      </a>

      <a href="#" class="account-nav-item ${isActive('stylists')}">
        <svg class="account-nav-icon" viewBox="0 0 24 24" fill="none">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" fill="currentColor"/>
        </svg>
        <div class="account-nav-content">
          <span class="account-nav-title">Your Stylists</span>
          <span class="account-nav-subtitle">Personalized looks</span>
        </div>
      </a>

      <div class="account-help">
        <div class="account-help-title">We're here to help, 24/7</div>
        <a href="#" class="account-help-link">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" fill="currentColor"/>
          </svg>
          <span>Customer Service</span>
        </a>
      </div>
    </aside>
  `;
}

/**
 * Initialize account nav after page load
 * Usage: Add <div id="account-nav-container"></div> to your HTML
 * Then call: initAccountNav({ activeItem: 'your-style' })
 */
export function initAccountNav(options = {}) {
  const container = document.getElementById('account-nav-container');
  if (container) {
    container.innerHTML = renderAccountNav(options);
  }
}
