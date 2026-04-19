import { T } from './Translator';

function About() {
  return (
    <div className="main-content">
      <h2><T>About This Site</T></h2>
      <p><T>Special thanks to <a href="https://www.avalonhill.com/worldwide">Avalon Hill</a> for many years of entertainment.</T></p>
      <hr />
      <h2><T>About Us</T></h2>
      <p><T>My name is Jordan Koplowicz and I am the sole proprietor of Koplowicz & Sons.  I have been building websites since 2005, and writing software a lot longer than that.  Please see my portfolio for some examples of my work.</T></p>
      <p><T>I work almost entirely with content management systems, especially Drupal.  I employ the latest techniques, including responsive design and SASS.</T></p>
      <p><T>I live in San Francisco with my wife and two sons.</T></p>
      <p><img style={{width: "100%"}} alt="Jordan Koplowicz and sons" src="Koplowicz-old.jpg"/></p>
    </div>
  );
}

export default About;
