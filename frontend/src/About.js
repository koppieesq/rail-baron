import { T } from './Translator';

function About() {
  return (
    <div className="main-content">
      <h2><T>About Us</T></h2>
      <p><T>My name is Jordan Koplowicz and I am the sole proprietor of Koplowicz & Sons.  I have been building websites since 2005, and writing software a lot longer than that.  Please see my portfolio for some examples of my work.</T></p>
      <p><T>I work almost entirely with content management systems, especially Drupal.  I employ the latest techniques, including responsive design and SASS.</T></p>
      <p><T>I live in San Francisco with my wife and two sons.</T></p>
      <p><img style={{width: "100%"}} alt="Jordan Koplowicz and sons" src="Koplowicz-old.jpg"/></p>
      <hr />
      <h2><T>About This Site</T></h2>
      <p><T>This is the </T><em><T>third</T></em><T> iteration:</T></p>
      <ul>
        <li><T>Tenuki Design</T></li>
        <li><T>Koplowicz & Sons (Drupal 7)</T></li>
        <li><T>Koplowicz & Sons (current)</T></li>
      </ul>
      <p><T>The current site is a headless Drupal 11 site with a React frontend.  I use Views with a json plugin to export my blog articles from the backend.  The site is hosted on a VPS with Digital Ocean, and is deployed with CI/CD courtesy of Github Actions.</T></p>
      <p><T>Special thanks to </T><strong><T>Nathan and Aaron</T></strong><T> for assistance with both design and implementation.</T></p>
    </div>
  );
}

export default About;
