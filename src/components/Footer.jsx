import React from 'react';

const Footer = () => {
	return (
		<div className=" w-screen bg-gradient-to-b from-teritary to-white shadow flex justify-center items-center absolute bottom-0 h-14 border-t border-teritary">
			<div className="text-primary text-sm font-semibold flex justify-between items-center w-full 2xl:max-w-screen-2xl xl:max-w-screen-xl lg:max-w-screen-lg md:max-w-screen-md sm:max-w-screen-sm max-w-sm ">
				Bản quyền © 2023 Viện nghiên cứu và phát triển Sản phẩm thiên nhiên
			</div>
		</div>
	);
};

export default Footer;
