package org.auscope.portal.server.web.controllers;

import java.io.InputStream;
import java.util.Map;

import javax.servlet.ServletContext;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import org.apache.commons.httpclient.HttpClient;
import org.apache.commons.httpclient.HttpMethodBase;
import org.apache.commons.httpclient.URI;
import org.auscope.portal.server.domain.filter.FilterBoundingBox;
import org.auscope.portal.server.util.GmlToKml;
import org.auscope.portal.server.web.WFSGetFeatureMethodMaker;
import org.auscope.portal.server.web.service.BoreholeService;
import org.auscope.portal.server.web.service.CSWCacheService;
import org.auscope.portal.server.web.service.HttpServiceCaller;
import org.jmock.Expectations;
import org.jmock.Mockery;
import org.jmock.lib.legacy.ClassImposteriser;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;
import org.springframework.web.servlet.ModelAndView;

public class TestNVCLController {
    private HttpServletRequest mockHttpRequest;
    private HttpServletResponse mockHttpResponse;
    private GmlToKml mockGmlToKml;
    private HttpSession mockHttpSession;
    private ServletContext mockServletContext;
    private HttpServiceCaller mockHttpServiceCaller;
    private HttpClient mockHttpClient;
    private CSWCacheService mockCSWService;
    private WFSGetFeatureMethodMaker mockWfsMethodMaker;
    private BoreholeService mockBoreholeService;
    private NVCLController nvclController;

    private Mockery context = new Mockery() {{
        setImposteriser(ClassImposteriser.INSTANCE);
    }};

    @Before
    public void setup() {

        this.mockGmlToKml = context.mock(GmlToKml.class);
        this.mockHttpRequest = context.mock(HttpServletRequest.class);
        this.mockHttpResponse = context.mock(HttpServletResponse.class);
        this.mockBoreholeService = context.mock(BoreholeService.class);
        this.mockHttpSession = context.mock(HttpSession.class);
        this.mockServletContext = context.mock(ServletContext.class);
        this.mockHttpServiceCaller = context.mock(HttpServiceCaller.class);
        this.mockCSWService = context.mock(CSWCacheService.class);
        this.mockHttpClient = context.mock(HttpClient.class);

        this.nvclController = new NVCLController(this.mockGmlToKml, this.mockBoreholeService, this.mockHttpServiceCaller, this.mockCSWService);
    }

    /**
     * Tests to ensure that a non hylogger request calls the correct functions
     * @throws Exception
     */
    @Test
    public void testNonHyloggerFilter() throws Exception {
        final String serviceUrl = "http://fake.com/wfs";
        final String nameFilter = "filterBob";
        final String custodianFilter = "filterCustodian";
        final String filterDate = "1986-10-09";
        final int maxFeatures = 10;
        final FilterBoundingBox bbox = new FilterBoundingBox("EPSG:4326", new double[] {1, 2}, new double[] {3,4});
        final String nvclWfsResponse = "wfsResponse";
        final String nvclKmlResponse = "kmlResponse";
        final HttpMethodBase mockHttpMethodBase = context.mock(HttpMethodBase.class);
        final URI httpMethodURI = new URI( "http://example.com");

        context.checking(new Expectations() {{
            oneOf(mockBoreholeService).getAllBoreholes(serviceUrl, nameFilter, custodianFilter, filterDate, maxFeatures, bbox);will(returnValue(mockHttpMethodBase));

            oneOf(mockHttpResponse).setContentType(with(any(String.class)));
            oneOf (mockHttpServiceCaller).getHttpClient();will(returnValue(mockHttpClient));
            oneOf (mockHttpServiceCaller).getMethodResponseAsString(mockHttpMethodBase, mockHttpClient); will(returnValue(nvclWfsResponse));
            oneOf (mockGmlToKml).convert(with(any(String.class)), with(any(InputStream.class)),with(any(String.class))); will(returnValue(nvclKmlResponse));

            allowing(mockHttpMethodBase).getURI();will(returnValue(httpMethodURI));

            allowing(mockHttpRequest).getSession();will(returnValue(mockHttpSession));
            allowing(mockHttpSession).getServletContext();will(returnValue(mockServletContext));
            allowing(mockServletContext).getResourceAsStream(with(any(String.class))); will(returnValue(null));
        }});

        ModelAndView response = this.nvclController.doBoreholeFilter(serviceUrl, nameFilter, custodianFilter, filterDate, maxFeatures, bbox, mockHttpRequest);
        Assert.assertTrue((Boolean) response.getModel().get("success"));

        Map data = (Map) response.getModel().get("data");
        Assert.assertNotNull(data);
        Assert.assertEquals(nvclWfsResponse, data.get("gml"));
        Assert.assertEquals(nvclKmlResponse, data.get("kml"));
    }


}
