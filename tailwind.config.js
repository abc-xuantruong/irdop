module.exports = {
	content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
	theme: {
		extend: {
			colors: {
				primary: '#0058a3',
				secondary: '#2BAE66FF',
				teritary: '#89CFF0',
				background: '#f5f5f5',
				text: {
					black: '#000000', // chữ màu đen
					gray: '#808080', // chữ màu xám
					secondary: '#3366CC',
					
				},
				checkbox: {
					bg: '#1e3a8a', // Màu nền mặc định
					checked: '#10b981', // Màu nền khi được chọn
				},
			},
			padding: {
				p2xl: '15rem',
				pxl: '10rem',
				plg: '6rem',
				pmd: '3rem',
				psm: '1rem',
			},
			box_width: {
				w2xl: '90rem', // 1440px
				wxl: '80rem', // 1280px
				wlg: '64rem', // 1024px
				wmd: '48rem', // 768px
				wsm: '40rem', // 640px
				wxs: '26.5625rem', // 425px
			},
			animation: {
				blink: 'blink 0.8s step-end infinite',
			},
			keyframes: {
				blink: {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0' },
				},
			},
		},
	},
	plugins: [],
};
