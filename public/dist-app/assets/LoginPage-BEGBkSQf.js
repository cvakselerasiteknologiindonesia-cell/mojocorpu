import{a as e,n as t,r as n,t as r}from"./api-p0O5BgxF.js";var i=e(n(),1),a=t(),o=[{role:`Super Admin`,identifier:`admin@mojokertokab.go.id`,password:`password`},{role:`Admin OPD`,identifier:`admin.opd@mojokertokab.go.id`,password:`password`},{role:`ASN`,identifier:`budi@mojokertokab.go.id`,password:`password`},{role:`Fasilitator Internal`,identifier:`siti.fasilitator@mojokertokab.go.id`,password:`password`},{role:`Fasilitator Eksternal`,identifier:`external.fasilitator@example.com`,password:`password`}];function s({onLogin:e}){let t=(0,i.useMemo)(()=>new URLSearchParams(window.location.search).get(`sso_unavailable`)===`1`,[]),[n,s]=(0,i.useState)({identifier:`admin@mojokertokab.go.id`,password:`password`}),[c,l]=(0,i.useState)(!1),[u,d]=(0,i.useState)(t),[f,p]=(0,i.useState)(t?`Server SSO Jakarta sedang tidak tersedia. Silakan masuk menggunakan NIP/email BKPSDM.`:``);(0,i.useEffect)(()=>{document.documentElement.setAttribute(`dir`,`ltr`),document.documentElement.setAttribute(`data-startbar`,`light`),document.documentElement.setAttribute(`data-bs-theme`,`light`);let e=[`/assets/css/bootstrap.min.css`,`/assets/css/icons.min.css`,`/assets/css/app.min.css`].map(e=>{if(document.querySelector(`link[href="${e}"]`))return null;let t=document.createElement(`link`);return t.rel=`stylesheet`,t.type=`text/css`,t.href=e,t.dataset.loginTemplate=`true`,document.head.appendChild(t),t}),t=document.createElement(`style`);return t.dataset.loginTemplate=`true`,t.textContent=`
      .auth-header-box.bg-black {
        background-color: #221816 !important;
      }

      .btn-primary {
        --bs-btn-bg: #c42007;
        --bs-btn-border-color: #c42007;
        --bs-btn-hover-bg: #8b1200;
        --bs-btn-hover-border-color: #8b1200;
        --bs-btn-active-bg: #8b1200;
        --bs-btn-active-border-color: #8b1200;
        --bs-btn-disabled-bg: #c42007;
        --bs-btn-disabled-border-color: #c42007;
        --bs-btn-color: #ffffff;
        --bs-btn-hover-color: #ffffff;
        --bs-btn-active-color: #ffffff;
        box-shadow: 0 8px 18px rgba(196, 32, 7, .22);
      }

      .btn-primary:focus-visible,
      .btn-outline-primary:focus-visible,
      .form-control:focus,
      .form-select:focus {
        border-color: #c42007;
        box-shadow: 0 0 0 .2rem rgba(196, 32, 7, .22);
      }

      .btn-outline-primary {
        --bs-btn-color: #c42007;
        --bs-btn-border-color: #c42007;
        --bs-btn-hover-bg: #c42007;
        --bs-btn-hover-border-color: #c42007;
        --bs-btn-hover-color: #ffffff;
        --bs-btn-active-bg: #8b1200;
        --bs-btn-active-border-color: #8b1200;
        --bs-btn-active-color: #ffffff;
      }

      .text-primary {
        color: #c42007 !important;
      }
    `,document.head.appendChild(t),()=>{e.forEach(e=>e?.remove()),t.remove(),document.documentElement.removeAttribute(`data-startbar`),document.documentElement.removeAttribute(`data-bs-theme`)}},[]),(0,i.useEffect)(()=>{if(!t)return;window.history.replaceState({},``,window.location.pathname);let e=window.setTimeout(()=>d(!1),3600);return()=>window.clearTimeout(e)},[t]);let m=e=>{s(t=>({...t,[e.target.name]:e.target.value}))},h=e=>{p(``),d(!1),s({identifier:e.identifier,password:e.password})};return(0,a.jsx)(`div`,{className:`container-xxl`,children:(0,a.jsx)(`div`,{className:`row vh-100 d-flex justify-content-center`,children:(0,a.jsx)(`div`,{className:`col-12 align-self-center`,children:(0,a.jsx)(`div`,{className:`card-body`,children:(0,a.jsx)(`div`,{className:`row`,children:(0,a.jsx)(`div`,{className:`col-lg-4 mx-auto`,children:(0,a.jsxs)(`div`,{className:`card`,children:[(0,a.jsx)(`div`,{className:`card-body p-0 bg-black auth-header-box rounded-top`,children:(0,a.jsxs)(`div`,{className:`text-center p-3`,children:[(0,a.jsx)(`a`,{href:`/`,className:`logo logo-admin`,children:(0,a.jsx)(`img`,{src:`/images/corpu-topbar-logo.png`,height:`50`,alt:`MAJA CORPU`,className:`auth-logo`})}),(0,a.jsx)(`h4`,{className:`mt-3 mb-1 fw-semibold text-white fs-18`,children:`Masuk ke MAJA CORPU`}),(0,a.jsx)(`p`,{className:`text-muted fw-medium mb-0`,children:`Gunakan akun resmi untuk melanjutkan.`})]})}),(0,a.jsxs)(`div`,{className:`card-body pt-0`,children:[(0,a.jsxs)(`form`,{className:`my-3`,onSubmit:async t=>{t.preventDefault(),l(!0),p(``);try{e((await r.post(`/auth/login`,{identifier:n.identifier,password:n.password,device_name:`corporateuniversity-app`})).data.data)}catch(e){p(e.response?.data?.message||e.response?.data?.errors?.identifier?.[0]||`Login gagal. Periksa kembali data Anda.`)}finally{l(!1)}},children:[(0,a.jsxs)(`div`,{className:`form-group mb-2`,children:[(0,a.jsx)(`label`,{className:`form-label`,htmlFor:`username`,children:`NIP atau Email`}),(0,a.jsx)(`input`,{type:`text`,className:`form-control`,id:`username`,name:`identifier`,value:n.identifier,onChange:m,placeholder:`Masukkan NIP atau email`,autoComplete:`username`,required:!0})]}),(0,a.jsxs)(`div`,{className:`form-group`,children:[(0,a.jsx)(`label`,{className:`form-label`,htmlFor:`userpassword`,children:`Password`}),(0,a.jsx)(`input`,{type:`password`,className:`form-control`,name:`password`,id:`userpassword`,value:n.password,onChange:m,placeholder:`Masukkan password`,autoComplete:`current-password`,required:!0})]}),(0,a.jsxs)(`div`,{className:`form-group row mt-3`,children:[(0,a.jsx)(`div`,{className:`col-sm-6`,children:(0,a.jsxs)(`div`,{className:`form-check form-switch form-switch-success`,children:[(0,a.jsx)(`input`,{className:`form-check-input`,type:`checkbox`,id:`customSwitchSuccess`}),(0,a.jsx)(`label`,{className:`form-check-label`,htmlFor:`customSwitchSuccess`,children:`Remember me`})]})}),(0,a.jsx)(`div`,{className:`col-sm-6 text-end`,children:(0,a.jsxs)(`a`,{href:`/login`,className:`text-muted font-13`,children:[(0,a.jsx)(`i`,{className:`dripicons-lock`}),` Lupa password?`]})})]}),f&&(0,a.jsx)(`div`,{className:`alert alert-danger py-2 mt-3 mb-0 font-13`,role:`alert`,children:f}),(0,a.jsx)(`div`,{className:`form-group mb-0 row`,children:(0,a.jsx)(`div`,{className:`col-12`,children:(0,a.jsx)(`div`,{className:`d-grid mt-3`,children:(0,a.jsxs)(`button`,{className:`btn btn-primary`,type:`submit`,disabled:c,children:[c?`Memproses...`:`Log In`,` `,(0,a.jsx)(`i`,{className:`fas fa-sign-in-alt ms-1`})]})})})})]}),(0,a.jsxs)(`div`,{className:`form-group mb-3`,children:[(0,a.jsx)(`label`,{className:`form-label`,htmlFor:`demoAccount`,children:`Demo akun sesuai role`}),(0,a.jsx)(`select`,{id:`demoAccount`,className:`form-select form-select-sm`,value:n.identifier,onChange:e=>{let t=o.find(t=>t.identifier===e.target.value);t&&h(t)},children:o.map(e=>(0,a.jsxs)(`option`,{value:e.identifier,children:[e.role,` - `,e.identifier]},e.identifier))})]}),(0,a.jsx)(`div`,{className:`d-grid`,children:(0,a.jsxs)(`button`,{type:`button`,onClick:()=>{let e=window.location.pathname===`/login`?new URLSearchParams(window.location.search).get(`redirect`)||`/dashboard`:window.location.pathname;sessionStorage.setItem(`corpu_post_login_path`,e===`/`?`/dashboard`:e),window.location.href=`/auth/sso/redirect`},className:`btn btn-outline-primary btn-sm`,children:[(0,a.jsx)(`i`,{className:`fas fa-user-shield me-1`}),` Masuk dengan SSO ASN`]})})]})]})})})})})})})}export{s as default};